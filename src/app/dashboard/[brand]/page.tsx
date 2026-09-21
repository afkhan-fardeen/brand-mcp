import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { GuidelineUploadForm } from "./guideline-upload-form";
import { McpUrlBadge } from "./mcp-url-badge";
import { ConnectGuide } from "./connect-guide";

export default async function BrandWorkspacePage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: brandId } = await params;
  const supabase = await createClient();

  const { data: brand } = await supabase.from("brands").select("id, name, slug").eq("id", brandId).maybeSingle();
  if (!brand) notFound();

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const mcpUrl = `${protocol}://${host}/api/mcp/${brand.slug}`;

  const [{ data: guidelines }, { data: campaigns }, { data: layoutRules }, { data: products }] =
    await Promise.all([
      supabase
        .from("brand_guidelines")
        .select("id, title, category, content, source_type, file_url, file_name, file_type")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("campaigns").select("id, name, is_active, design_rules").eq("brand_id", brandId),
      supabase.from("layout_rules").select("id, asset_type, dimensions").eq("brand_id", brandId),
      supabase.from("products").select("id, sku, name, transparent_png_url").eq("brand_id", brandId).limit(20),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-6">
        <h1 className="title text-3xl">{brand.name}</h1>
        <div className="w-96">
          <McpUrlBadge url={mcpUrl} />
        </div>
      </div>

      <ConnectGuide mcpUrl={mcpUrl} slug={brand.slug} />

      <section>
        <p className="section-label text-sm">Brand Guidelines</p>
        <div className="mt-3 flex flex-col gap-3">
          <GuidelineUploadForm brandId={brandId} />
          {guidelines?.length ? (
            guidelines.map((g) => (
              <Card key={g.id} className="py-3">
                <div className="flex items-center gap-2">
                  {g.title && <span className="text-sm font-semibold">{g.title}</span>}
                  <span className="text-xs font-semibold text-accent">{g.category}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{g.content}</p>
                {g.file_url && (
                  <a
                    href={g.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-accent"
                  >
                    {g.file_name} ↗
                  </a>
                )}
              </Card>
            ))
          ) : (
            <p className="text-sm text-foreground-muted">No guidelines added yet.</p>
          )}
        </div>
      </section>

      <section>
        <p className="section-label text-sm">Campaigns</p>
        <div className="mt-3 flex flex-col gap-2">
          {campaigns?.length ? (
            campaigns.map((c) => (
              <Card key={c.id} className="py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{c.name}</span>
                  {c.is_active && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                      active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-foreground-muted">{c.design_rules}</p>
              </Card>
            ))
          ) : (
            <p className="text-sm text-foreground-muted">No campaigns configured yet.</p>
          )}
        </div>
      </section>

      <section>
        <p className="section-label text-sm">Layout Rules</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {layoutRules?.length ? (
            layoutRules.map((l) => (
              <Card key={l.id} className="py-3">
                <span className="text-sm font-semibold">{l.asset_type}</span>
                <p className="text-sm text-foreground-muted">{l.dimensions}</p>
              </Card>
            ))
          ) : (
            <p className="text-sm text-foreground-muted">No layout rules configured yet.</p>
          )}
        </div>
      </section>

      <section>
        <p className="section-label text-sm">Products</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {products?.length ? (
            products.map((p) => (
              <Card key={p.id} className="flex flex-col items-center gap-2 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.transparent_png_url} alt={p.name} className="h-20 w-20 object-contain" />
                <span className="text-xs text-foreground-muted">{p.sku}</span>
              </Card>
            ))
          ) : (
            <p className="text-sm text-foreground-muted">No products uploaded yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
