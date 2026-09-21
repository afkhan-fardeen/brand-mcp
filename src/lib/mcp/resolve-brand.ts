import { createServiceClient } from "@/lib/supabase/server";

export class BrandResolutionError extends Error {}

/**
 * Resolves the brand for a per-brand MCP URL (/api/mcp/<slug>). The slug comes straight
 * from the route, not from anything the AI supplies, so this is the one place brand
 * identity is decided — every tool call after this is scoped to the resulting brandId.
 */
export async function resolveBrandBySlug(slug: string): Promise<{ id: string; name: string }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new BrandResolutionError(`Error: could not look up brand "${slug}" (${error.message}).`);
  }

  if (!data) {
    const { data: allBrands } = await supabase.from("brands").select("slug");
    const known = allBrands?.length ? allBrands.map((b) => b.slug).join(", ") : "none configured yet";
    throw new BrandResolutionError(
      `Error: no brand found for MCP URL "/api/mcp/${slug}". Known brand slugs: ${known}.`,
    );
  }

  return data;
}
