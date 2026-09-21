import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { createServiceClient } from "@/lib/supabase/server";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

/** Turns a thrown error into a plain-text tool result instead of a hard failure —
 *  the AI reads this and can self-correct on it (rules.md #4). */
async function safely(fn: () => Promise<string>): Promise<ToolResult> {
  try {
    return { content: [{ type: "text", text: await fn() }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
  }
}

type GuidelineRow = {
  title: string | null;
  category: string;
  content: string;
  file_url?: string | null;
  file_name?: string | null;
};

const formatGuideline = (g: GuidelineRow) =>
  `[${g.category}]${g.title ? ` ${g.title}` : ""} ${g.content}` +
  (g.file_url ? ` (source file: ${g.file_name} — ${g.file_url})` : "");

/**
 * Registers the brand's MCP tools. This server is mounted at a per-brand URL
 * (/api/mcp/<slug>), so brandId is resolved once from that URL and closed over here —
 * tools never take a brand_name parameter, so the AI can't point them at the wrong brand.
 */
export function registerTools(server: McpServer, brandId: string) {
  server.registerTool(
    "get_brand_guidelines",
    {
      title: "Get Brand Guidelines",
      description:
        "Use this tool BEFORE generating any creative asset. Returns this brand's typography, color palette, " +
        "and photography-style guidelines (as text and/or links to uploaded source files — PDFs, docs, images), " +
        "optionally filtered by category, plus the design rules for any active campaign matching campaign_name " +
        "(e.g. 'Saudi National Day'). Call this before get_layout_rules.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe("Optional category filter, e.g. 'typography', 'color_palette', 'photography_style'. Omit to get all guidelines."),
        campaign_name: z
          .string()
          .optional()
          .describe("Optional active campaign name to also fetch design rules for, e.g. 'Saudi National Day 2026'."),
      },
    },
    async ({ category, campaign_name }) =>
      safely(async () => {
        const supabase = createServiceClient();
        const sections: string[] = [];

        let query = supabase
          .from("brand_guidelines")
          .select("title, category, content, file_url, file_name")
          .eq("brand_id", brandId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (category) query = query.ilike("category", category);

        const { data, error } = await query;
        if (error) throw new Error(`could not fetch guidelines — ${error.message}`);
        sections.push(
          data?.length
            ? data.map(formatGuideline).join("\n")
            : category
              ? `No guidelines found in category "${category}".`
              : `No guidelines are configured yet. Ask the user to add some in the dashboard.`,
        );

        if (campaign_name) {
          const { data: campaign } = await supabase
            .from("campaigns")
            .select("name, design_rules, is_active")
            .eq("brand_id", brandId)
            .ilike("name", campaign_name)
            .maybeSingle();

          sections.push(
            campaign
              ? `Campaign "${campaign.name}"${campaign.is_active ? "" : " (INACTIVE — confirm with the user before using)"}: ${campaign.design_rules}`
              : `Error: campaign "${campaign_name}" was not found. Proceeding without campaign-specific rules — ask the user to confirm the campaign name.`,
          );
        }

        return sections.join("\n\n");
      }),
  );

  server.registerTool(
    "get_layout_rules",
    {
      title: "Get Layout Rules",
      description:
        "Use this tool to retrieve the strict width, height, and negative-space/composition requirements for a " +
        "standard e-commerce asset type BEFORE generating any image. Requires asset_type (e.g. 'hero_banner', " +
        "'ig_story', 'square_social'). Call this after get_brand_guidelines.",
      inputSchema: {
        asset_type: z
          .string()
          .describe("The e-commerce asset type to get layout rules for, e.g. 'hero_banner', 'ig_story', 'square_social'."),
      },
    },
    async ({ asset_type }) =>
      safely(async () => {
        const supabase = createServiceClient();
        const { data, error } = await supabase
          .from("layout_rules")
          .select("dimensions, composition_rules")
          .eq("brand_id", brandId)
          .ilike("asset_type", asset_type)
          .maybeSingle();

        if (error) throw new Error(`could not fetch layout rules — ${error.message}`);
        if (!data) {
          const { data: known } = await supabase.from("layout_rules").select("asset_type").eq("brand_id", brandId);
          const list = known?.map((k) => k.asset_type).join(", ") ?? "none configured";
          return `Error: no layout rules found for asset_type "${asset_type}". Known asset types: ${list}.`;
        }

        return `Dimensions: ${data.dimensions}\nComposition rules: ${data.composition_rules}`;
      }),
  );

  server.registerTool(
    "search_product_assets",
    {
      title: "Search Product Assets",
      description:
        "Use this tool to find this brand's transparent product PNG cutouts by SKU, name, or free-text " +
        "description — never invent or guess a product image URL. Requires product_query (a SKU, product name, " +
        "or descriptive phrase like 'blue hoodie').",
      inputSchema: {
        product_query: z.string().describe("SKU, product name, or free-text description to search for."),
      },
    },
    async ({ product_query }) =>
      safely(async () => {
        const supabase = createServiceClient();
        const { data, error } = await supabase
          .from("products")
          .select("sku, name, description, transparent_png_url")
          .eq("brand_id", brandId)
          .or(`sku.ilike.%${product_query}%,name.ilike.%${product_query}%,description.ilike.%${product_query}%`)
          .limit(10);

        if (error) throw new Error(`could not search products — ${error.message}`);
        if (!data?.length) {
          return `Error: no products matching "${product_query}" found. Ask the user to verify the SKU or product name.`;
        }

        return data
          .map((p) => `SKU: ${p.sku} | ${p.name}${p.description ? ` — ${p.description}` : ""} | PNG: ${p.transparent_png_url}`)
          .join("\n");
      }),
  );
}
