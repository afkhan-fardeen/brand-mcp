-- Brand guidelines now accept any uploaded file (PDF, DOCX, image, plain text) rather than
-- only a typed text row. `content` becomes the extracted/typed text used for embedding and
-- for the get_brand_guidelines MCP tool's output; `file_url`/`file_name`/`file_type` point
-- back at the original upload in Supabase Storage so the AI/dashboard can link to the source.

alter table brand_guidelines
  add column title text,
  add column source_type text not null default 'text' check (source_type in ('text', 'file')),
  add column file_url text,
  add column file_name text,
  add column file_type text; -- MIME type, e.g. 'application/pdf', 'image/png'

alter table brand_guidelines alter column category drop not null;
alter table brand_guidelines alter column category set default 'general';

comment on column brand_guidelines.content is
  'Extracted or typed text used for embedding + AI-facing display. For images or files with no extractable text, this falls back to admin-entered notes describing the asset.';

-- Storage bucket for guideline uploads (PDFs, docs, images). Public bucket, same pattern as
-- the existing product-cutout URLs (transparent_png_url) — access control happens at the
-- table/row level via RLS + brand_id, not by hiding the storage URL itself.
insert into storage.buckets (id, name, public)
values ('brand-guidelines', 'brand-guidelines', true)
on conflict (id) do nothing;

create policy "authenticated manage brand-guidelines files"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'brand-guidelines')
  with check (bucket_id = 'brand-guidelines');

create policy "public read brand-guidelines files"
  on storage.objects for select
  to public
  using (bucket_id = 'brand-guidelines');

-- Refresh the semantic-search RPC to surface the new columns.
drop function if exists match_brand_guidelines(uuid, vector(1536), int);

create function match_brand_guidelines(
  p_brand_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 5
)
returns table (
  id uuid,
  title text,
  category text,
  content text,
  source_type text,
  file_url text,
  file_name text,
  similarity float
)
language sql stable
as $$
  select id, title, category, content, source_type, file_url, file_name,
         1 - (embedding <=> p_query_embedding) as similarity
  from brand_guidelines
  where brand_id = p_brand_id
  order by embedding <=> p_query_embedding
  limit p_match_count;
$$;
