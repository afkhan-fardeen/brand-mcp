"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractText } from "@/lib/mcp/extract-text";

/**
 * Adds a brand guideline from an uploaded file (PDF, DOCX, image, ...), typed notes, or
 * both. Text is extracted where possible so the AI can read it via get_brand_guidelines;
 * for files with no extractable text (images, unsupported types) the admin's notes carry
 * the content.
 */
export async function uploadGuideline(brandId: string, formData: FormData) {
  const supabase = await createClient();

  const title = (formData.get("title") as string) || null;
  const category = (formData.get("category") as string) || "general";
  const notes = ((formData.get("notes") as string) || "").trim();
  const file = formData.get("file") as File | null;

  let fileUrl: string | null = null;
  let fileName: string | null = null;
  let fileType: string | null = null;
  let extracted: string | null = null;

  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${brandId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("brand-guidelines")
      .upload(path, buffer, { contentType: file.type || "application/octet-stream" });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: publicUrl } = supabase.storage.from("brand-guidelines").getPublicUrl(path);
    fileUrl = publicUrl.publicUrl;
    fileName = file.name;
    fileType = file.type || null;
    extracted = await extractText(buffer, file.type);
  }

  const content = [notes, extracted].filter(Boolean).join("\n\n") ||
    (fileName ? `Uploaded file: ${fileName} (no extracted text — add notes describing this asset).` : "");

  if (!content) {
    throw new Error("Provide a file, notes, or both.");
  }

  const { error } = await supabase.from("brand_guidelines").insert({
    brand_id: brandId,
    title,
    category,
    content,
    source_type: file ? "file" : "text",
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileType,
  });
  if (error) throw new Error(`Could not save guideline: ${error.message}`);

  revalidatePath(`/dashboard/${brandId}`);
}
