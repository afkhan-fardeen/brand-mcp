-- Each brand now gets its own MCP URL (/api/mcp/<slug>) instead of tools taking a
-- brand_name parameter, so the AI can never mix up which brand it's talking to.
alter table brands add column slug text;

update brands set slug = lower(regexp_replace(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
where slug is null;

alter table brands alter column slug set not null;
alter table brands add constraint brands_slug_unique unique (slug);
create index idx_brands_slug on brands(slug);

-- Embeddings/semantic search and the Photoroom/Inngest compositing pipeline are no longer
-- needed here — the AI client (Claude/Gemini) reasons over the raw guideline text/files and
-- product PNGs itself once fetched through the per-brand MCP tools.
drop function if exists match_brand_guidelines(uuid, vector(1536), int);
drop index if exists idx_guidelines_embedding;
alter table brand_guidelines drop column if exists embedding;
drop table if exists generation_jobs;
