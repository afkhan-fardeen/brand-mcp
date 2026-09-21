"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Creates a brand workspace with a URL-safe slug — that slug becomes the brand's
 *  dedicated MCP endpoint at /api/mcp/<slug>, so it must be unique and stable. */
export async function createBrand(formData: FormData) {
  const name = (formData.get("name") as string || "").trim();
  if (!name) throw new Error("Brand name is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .insert({ name, slug: slugify(name) })
    .select("id")
    .single();

  if (error) throw new Error(`Could not create brand: ${error.message}`);

  revalidatePath("/dashboard");
  redirect(`/dashboard/${data.id}`);
}
