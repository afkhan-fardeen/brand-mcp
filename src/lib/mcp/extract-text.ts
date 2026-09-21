import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const MAX_CONTENT_CHARS = 8000;

/**
 * Best-effort text extraction so uploaded guideline files (PDF, DOCX, plain text) can be
 * embedded and semantically searched. Images and unsupported types return null — the
 * caller falls back to admin-entered notes for those.
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    if (mimeType === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      return truncate(result.text);
    }

    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return truncate(result.value);
    }

    if (mimeType.startsWith("text/") || mimeType === "application/json") {
      return truncate(buffer.toString("utf-8"));
    }

    return null;
  } catch {
    return null;
  }
}

function truncate(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_CONTENT_CHARS ? trimmed.slice(0, MAX_CONTENT_CHARS) : trimmed;
}
