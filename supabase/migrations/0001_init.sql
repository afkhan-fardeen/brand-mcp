-- 1. Enable pgvector for AI semantic search capability
create extension if not exists vector;

-- 2. The Core Brands Table (The Tenant)
create table brands (
  id uuid primary key default gen_random_uuid(),
  name text unique not null, -- e.g., 'Seissense', 'Love Boo'
  created_at timestamptz default now()
);

-- 3. Brand Guidelines (With Vector Embeddings)
create table brand_guidelines (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  category text not null, -- 'typography', 'color_palette', 'photography_style'
  content text not null,  -- e.g., "Use pastel hex codes..."
  embedding vector(1536), -- text-embedding-3-small
  created_at timestamptz default now()
);

-- 4. Campaign & Seasonal Rules
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  name text not null, -- e.g., 'Saudi National Day 2026'
  is_active boolean default true,
  design_rules text not null, -- e.g., "Use Pantone 349 C, subtle palm motifs, no generic flags."
  created_at timestamptz default now()
);

-- 5. Layout Rules (E-commerce Wireframes)
create table layout_rules (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  asset_type text not null, -- e.g., 'hero_banner', 'ig_story'
  dimensions text not null, -- e.g., '1920x1080'
  composition_rules text not null, -- e.g., "Left 40% negative space, subject anchored right."
  created_at timestamptz default now()
);

-- 6. Product Cutouts (The Actual SKU Assets)
create table products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  transparent_png_url text not null, -- Supabase Storage URL
  created_at timestamptz default now(),
  unique (brand_id, sku)
);

-- 7. Generation Jobs (async compositing — rules.md #5: never hold the MCP connection open)
create table generation_jobs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  request jsonb not null,      -- source image urls, layout, art-direction prompt
  result_url text,             -- final composited image url, once completed
  error text,                  -- natural-language failure reason surfaced back to the AI
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. Indexes
create index idx_guidelines_brand on brand_guidelines(brand_id);
create index idx_campaigns_brand on campaigns(brand_id);
create index idx_products_brand on products(brand_id);
create index idx_jobs_brand on generation_jobs(brand_id);
create index idx_guidelines_embedding on brand_guidelines using hnsw (embedding vector_cosine_ops);

-- 9. Row Level Security — every table is brand-scoped; the dashboard uses the anon/user
-- client (RLS-enforced), the MCP server uses the service-role client (RLS-bypassed) and
-- must therefore validate brand_id in application code before every query (rules.md #1).
alter table brands enable row level security;
alter table brand_guidelines enable row level security;
alter table campaigns enable row level security;
alter table layout_rules enable row level security;
alter table products enable row level security;
alter table generation_jobs enable row level security;

-- Authenticated users can read/write everything for now (single internal marketing team).
-- Tighten to a brand_members join table if per-brand user access control is needed later.
create policy "authenticated read brands" on brands for select to authenticated using (true);
create policy "authenticated write brands" on brands for all to authenticated using (true) with check (true);

create policy "authenticated read guidelines" on brand_guidelines for select to authenticated using (true);
create policy "authenticated write guidelines" on brand_guidelines for all to authenticated using (true) with check (true);

create policy "authenticated read campaigns" on campaigns for select to authenticated using (true);
create policy "authenticated write campaigns" on campaigns for all to authenticated using (true) with check (true);

create policy "authenticated read layout_rules" on layout_rules for select to authenticated using (true);
create policy "authenticated write layout_rules" on layout_rules for all to authenticated using (true) with check (true);

create policy "authenticated read products" on products for select to authenticated using (true);
create policy "authenticated write products" on products for all to authenticated using (true) with check (true);

create policy "authenticated read jobs" on generation_jobs for select to authenticated using (true);
create policy "authenticated write jobs" on generation_jobs for all to authenticated using (true) with check (true);

-- 10. Brand-scoped semantic search over guidelines, used by the get_brand_guidelines MCP tool.
create function match_brand_guidelines(
  p_brand_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 5
)
returns table (id uuid, category text, content text, similarity float)
language sql stable
as $$
  select id, category, content, 1 - (embedding <=> p_query_embedding) as similarity
  from brand_guidelines
  where brand_id = p_brand_id
  order by embedding <=> p_query_embedding
  limit p_match_count;
$$;
