import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveBrandId, BrandResolutionError } from "@/lib/mcp/resolve-brand";
import { embed } from "@/lib/mcp/embeddings";
import { inngest } from "@/lib/inngest/client";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

/** Turns a thrown error (esp. BrandResolutionError) into a plain-text tool result
 *  instead of a hard failure — the AI reads this and can self-correct (rules.md #4). */
async function safely(fn: () => Promise<string>): Promise<ToolResult> {
  try {
    return { content: [{ type: "text", text: await fn() }] };
  } catch (err) {
    const message =
      err instanceof BrandResolutionError ? err.message : `Error: ${(err as Error).message}`;
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function registerTools(server: McpServer) {
  server.registerTool(
    "get_brand_guidelines",
    {
      title: "Get Brand Guidelines",
      description:
        "Use this tool BEFORE generating any creative asset for a brand. Requires the exact brand_name " +
        "(e.g. 'Seissense', 'Love Boo') — never guess or default to a brand if the user hasn't specified one; " +
        "ask the user instead. Returns typography, color palette, and photography-style rules for that brand, " +
        "semantically ranked against an optional topic, plus the design rules for any active campaign matching " +
        "campaign_name (e.g. 'Saudi National Day'). Call this before get_layout_rules and generate_composited_shot.",
      inputSchema: {
        brand_name: z
          .string()
          .describe("The exact brand name this asset is for. Required — reject the request rather than guessing if missing."),
        topic: z
          .string()
          .optional()
          .describe("Optional free-text topic to semantically rank guidelines by, e.g. 'lighting for product photography'. Omit for the top general guidelines."),
        campaign_name: z
          .string()
          .optional()
          .describe("Optional active campaign name to also fetch design rules for, e.g. 'Saudi National Day 2026'."),
      },
    },
    async ({ brand_name, topic, campaign_name }) =>
      safely(async () => {
        const brandId = await resolveBrandId(brand_name);
        const supabase = createServiceClient();
        const sections: string[] = [];

        if (topic) {
          const queryEmbedding = await embed(topic);
          const { data, error } = await supabase.rpc("match_brand_guidelines", {
            p_brand_id: brandId,
            p_query_embedding: queryEmbedding,
            p_match_count: 5,
          });
          if (error) throw new Error(`could not search guidelines — ${error.message}`);
          sections.push(
            data?.length
              ? data.map((g: { category: string; content: string }) => `[${g.category}] ${g.content}`).join("\n")
              : `No guidelines found for "${brand_name}" matching "${topic}".`,
          );
        } else {
          const { data, error } = await supabase
            .from("brand_guidelines")
            .select("category, content")
            .eq("brand_id", brandId)
            .order("created_at", { ascending: false })
            .limit(10);
          if (error) throw new Error(`could not fetch guidelines — ${error.message}`);
          sections.push(
            data?.length
              ? data.map((g) => `[${g.category}] ${g.content}`).join("\n")
              : `No guidelines are configured yet for "${brand_name}". Ask the user to add some in the dashboard.`,
          );
        }

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
              : `Error: campaign "${campaign_name}" was not found for "${brand_name}". Proceeding without campaign-specific rules — ask the user to confirm the campaign name.`,
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
        "standard e-commerce asset type BEFORE generating any image. Requires brand_name and asset_type " +
        "(e.g. 'hero_banner', 'ig_story', 'square_social'). Call this after get_brand_guidelines and before " +
        "generate_composited_shot so the art-direction prompt respects the brand's exact composition rules.",
      inputSchema: {
        brand_name: z.string().describe("The exact brand name. Required."),
        asset_type: z
          .string()
          .describe("The e-commerce asset type to get layout rules for, e.g. 'hero_banner', 'ig_story', 'square_social'."),
      },
    },
    async ({ brand_name, asset_type }) =>
      safely(async () => {
        const brandId = await resolveBrandId(brand_name);
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
          return `Error: no layout rules found for asset_type "${asset_type}" under "${brand_name}". Known asset types: ${list}.`;
        }

        return `Dimensions: ${data.dimensions}\nComposition rules: ${data.composition_rules}`;
      }),
  );

  server.registerTool(
    "search_product_assets",
    {
      title: "Search Product Assets",
      description:
        "Use this tool to find a brand's transparent product PNG cutouts by SKU, name, or free-text description " +
        "BEFORE calling generate_composited_shot — never invent or guess a product image URL. Requires brand_name " +
        "and product_query (a SKU, product name, or descriptive phrase like 'blue hoodie').",
      inputSchema: {
        brand_name: z.string().describe("The exact brand name to search products within. Required."),
        product_query: z.string().describe("SKU, product name, or free-text description to search for."),
      },
    },
    async ({ brand_name, product_query }) =>
      safely(async () => {
        const brandId = await resolveBrandId(brand_name);
        const supabase = createServiceClient();
        const { data, error } = await supabase
          .from("products")
          .select("sku, name, description, transparent_png_url")
          .eq("brand_id", brandId)
          .or(`sku.ilike.%${product_query}%,name.ilike.%${product_query}%,description.ilike.%${product_query}%`)
          .limit(10);

        if (error) throw new Error(`could not search products — ${error.message}`);
        if (!data?.length) {
          return `Error: no products matching "${product_query}" found for "${brand_name}". Ask the user to verify the SKU or product name.`;
        }

        return data
          .map((p) => `SKU: ${p.sku} | ${p.name}${p.description ? ` — ${p.description}` : ""} | PNG: ${p.transparent_png_url}`)
          .join("\n");
      }),
  );

  server.registerTool(
    "generate_composited_shot",
    {
      title: "Generate Composited Shot",
      description:
        "Use this tool ONLY after calling get_brand_guidelines, get_layout_rules, and search_product_assets for " +
        "this request. Routes the exact product PNG URLs and a detailed art-direction prompt to the compositing " +
        "API, which locks the product pixels and generates the background/lighting/shadows. Because compositing " +
        "can take longer than a single tool call should block for, this ALWAYS returns immediately with a job_id " +
        "and status 'processing' — do not wait on this call. Tell the user generation has started, then poll " +
        "check_generation_status with the returned job_id to get the final image URL.",
      inputSchema: {
        brand_name: z.string().describe("The exact brand name. Required."),
        source_image_urls: z
          .array(z.string().url())
          .min(1)
          .describe("The exact transparent PNG URL(s) from search_product_assets — never a hallucinated or guessed URL."),
        dimensions: z.string().describe("Target output dimensions from get_layout_rules, e.g. '1920x1080'."),
        art_direction_prompt: z
          .string()
          .describe(
            "A single, highly detailed art-direction instruction synthesizing the brand guidelines, active " +
              "campaign rules, and layout composition rules into concrete visual direction (background, colors, " +
              "lighting, composition). This is the ONLY creative input the compositing API receives.",
          ),
      },
    },
    async ({ brand_name, source_image_urls, dimensions, art_direction_prompt }) =>
      safely(async () => {
        const brandId = await resolveBrandId(brand_name);
        const supabase = createServiceClient();

        const { data: job, error } = await supabase
          .from("generation_jobs")
          .insert({
            brand_id: brandId,
            status: "processing",
            request: { source_image_urls, dimensions, art_direction_prompt },
          })
          .select("id")
          .single();

        if (error) throw new Error(`could not create generation job — ${error.message}`);

        await inngest.send({
          name: "compositing/requested",
          data: {
            jobId: job.id,
            brandId,
            sourceImageUrls: source_image_urls,
            artDirectionPrompt: art_direction_prompt,
            dimensions,
          },
        });

        return `Generation started. job_id: ${job.id}, status: processing. Poll check_generation_status with this job_id to retrieve the final image.`;
      }),
  );

  server.registerTool(
    "check_generation_status",
    {
      title: "Check Generation Status",
      description:
        "Use this tool to poll the result of a job started by generate_composited_shot. Requires the job_id " +
        "returned by that call. Returns status 'processing', 'completed' (with result image URL), or 'failed' " +
        "(with a natural-language reason to relay to the user).",
      inputSchema: {
        job_id: z.string().describe("The job_id returned by generate_composited_shot."),
      },
    },
    async ({ job_id }) =>
      safely(async () => {
        const supabase = createServiceClient();
        const { data, error } = await supabase
          .from("generation_jobs")
          .select("status, result_url, error")
          .eq("id", job_id)
          .maybeSingle();

        if (error) throw new Error(`could not check job status — ${error.message}`);
        if (!data) return `Error: no generation job found with job_id "${job_id}". Verify the id from generate_composited_shot.`;
        if (data.status === "completed") return `status: completed\nimage_url: ${data.result_url}`;
        if (data.status === "failed") return `status: failed\n${data.error}`;
        return `status: processing — check back shortly.`;
      }),
  );
}
