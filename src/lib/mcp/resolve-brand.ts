import { createServiceClient } from "@/lib/supabase/server";

export class BrandResolutionError extends Error {}

/**
 * Every MCP tool must call this before touching any other table (rules.md #1).
 * Never trust the AI's brand_name — validate it against Postgres and fail loudly,
 * with a natural-language message the AI can relay to the user (rules.md #4).
 */
export async function resolveBrandId(brandName: string): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name")
    .ilike("name", brandName.trim())
    .maybeSingle();

  if (error) {
    throw new BrandResolutionError(
      `Error: could not look up brand "${brandName}" (${error.message}). Please retry.`,
    );
  }

  if (!data) {
    const { data: allBrands } = await supabase.from("brands").select("name");
    const known = allBrands?.map((b) => b.name).join(", ") ?? "none configured yet";
    throw new BrandResolutionError(
      `Error: brand "${brandName}" was not found. Known brands: ${known}. ` +
        `Please ask the user which brand this asset belongs to, or use an exact brand name.`,
    );
  }

  return data.id;
}
