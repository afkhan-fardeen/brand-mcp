# BrandHub

Multi-tenant brand knowledge base and MCP server. Marketing teams manage isolated brand
workspaces (guidelines, campaigns, layout rules, product cutouts) in the dashboard. Each
brand gets its own dedicated MCP URL (`/api/mcp/<slug>`) that AI clients (Claude, Gemini,
Cursor) connect to — the URL itself scopes every tool call to that brand, so there's no
`brand_name` parameter to get wrong. The AI reads the raw guideline text/files and product
PNGs through the tools and does its own reasoning and image generation from there.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Supabase (Postgres, Auth, Storage)
- `mcp-handler` for the per-brand MCP route (`/api/mcp/[brand]`)
- `pdf-parse` / `mammoth` to extract text from uploaded PDF/DOCX guideline files

## Setup

1. Create a Supabase project, then run the migrations in order:
   ```bash
   npx supabase db push --project-ref <your-ref> -p '<your-db-password>'
   ```
   (or paste each file in `supabase/migrations/` into the SQL editor, in order)

2. Copy `.env.example` to `.env.local` and fill in:
   - Supabase URL/keys (Project Settings → API)
   - `MCP_SERVER_SECRET` — the bearer token AI clients must send to `/api/mcp/<slug>`
     (generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Create a brand in the dashboard (`/dashboard`) — this generates its slug. Copy its MCP
   URL from the brand workspace page and point an MCP client at
   `https://<your-deployment>/api/mcp/<slug>` with an `Authorization: Bearer
   <MCP_SERVER_SECRET>` header.

## Structure

- `src/app/dashboard` — brand-workspace admin UI (guidelines, campaigns, layout rules, products)
- `src/app/api/mcp/[brand]` — per-brand MCP tool server (`get_brand_guidelines`,
  `get_layout_rules`, `search_product_assets`)
- `src/lib/mcp` — brand-slug resolution, text extraction, and tool definitions
- `src/lib/supabase` — browser/server/service Supabase clients
- `supabase/migrations` — schema (brands, brand_guidelines, campaigns, layout_rules, products)
