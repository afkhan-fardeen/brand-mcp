# BrandHub

Multi-tenant brand knowledge base and MCP server. Marketing teams manage isolated brand
workspaces (guidelines, campaigns, layout rules, product cutouts) in the dashboard; AI
clients (Claude Desktop, Cursor) consume that data through brand-scoped MCP tools and
route image generation to a compositing API that locks product pixels.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Supabase (Postgres, pgvector, Auth, Storage)
- `mcp-handler` for the MCP route (`/api/mcp`)
- Inngest for async compositing jobs (`/api/inngest`)
- Photoroom API for product-locked compositing

## Setup

1. Create a Supabase project, then run the migration:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```
   (or paste `supabase/migrations/0001_init.sql` into the SQL editor)

2. Copy `.env.example` to `.env.local` and fill in:
   - Supabase URL/keys (Project Settings → API)
   - `OPENAI_API_KEY` — used to embed `brand_guidelines.content` for semantic search
   - `PHOTOROOM_API_KEY` — the compositing backend
   - `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` — from the Inngest dashboard once deployed (optional locally, the Inngest Dev Server auto-discovers `/api/inngest`)
   - `MCP_SERVER_SECRET` — the bearer token AI clients must send to `/api/mcp`

3. Run the dev server:
   ```bash
   npm run dev
   ```
   and, in a second terminal, the Inngest Dev Server:
   ```bash
   npx inngest-cli@latest dev
   ```

4. Point an MCP client (Claude Desktop, Cursor) at `http://localhost:3000/api/mcp` with an
   `Authorization: Bearer <MCP_SERVER_SECRET>` header.

## Structure

- `src/app/dashboard` — brand-workspace admin UI (guidelines, campaigns, layout rules, products)
- `src/app/api/mcp` — MCP tool server (`get_brand_guidelines`, `get_layout_rules`,
  `search_product_assets`, `generate_composited_shot`, `check_generation_status`)
- `src/app/api/inngest` — background job runner for the compositing pipeline
- `src/lib/mcp` — brand resolution, embeddings, and tool definitions
- `src/lib/supabase` — browser/server/service Supabase clients
- `supabase/migrations` — schema (brands, brand_guidelines, campaigns, layout_rules,
  products, generation_jobs) and the `match_brand_guidelines` vector-search RPC
