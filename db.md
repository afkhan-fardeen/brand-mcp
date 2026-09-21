-- 1. Enable pgvector for AI semantic search capability
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. The Core Brands Table (The Tenant)
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- e.g., 'Seissense', 'Love Boo'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Brand Guidelines (With Vector Embeddings)
CREATE TABLE brand_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'typography', 'color_palette', 'photography_style'
  content TEXT NOT NULL,  -- e.g., "Use pastel hex codes..."
  embedding vector(1536), -- Stores the math representation for AI semantic search
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Campaign & Seasonal Rules
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Saudi National Day 2026'
  is_active BOOLEAN DEFAULT TRUE,
  design_rules TEXT NOT NULL, -- e.g., "Use Pantone 349 C, subtle palm motifs, no generic flags."
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Layout Rules (E-commerce Wireframes)
CREATE TABLE layout_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- e.g., 'hero_banner', 'ig_story'
  dimensions TEXT NOT NULL, -- e.g., '1920x1080'
  composition_rules TEXT NOT NULL, -- e.g., "Left 40% negative space, subject anchored right."
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Product Cutouts (The Actual SKU Assets)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  transparent_png_url TEXT NOT NULL, -- Supabase Storage URL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Add Indexes for Performance
CREATE INDEX idx_guidelines_brand ON brand_guidelines(brand_id);
CREATE INDEX idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX idx_products_brand ON products(brand_id);

How the MCP Interacts with this Schema
When you prompt Claude with "I need a Seissense hero banner for Saudi National Day featuring SKU-123", your Next.js MCP server executes a sequence of highly specific Supabase queries:

Brand Resolution: It looks up name = 'Seissense' in the brands table to grab the brand_id.

Context Assembly: Using that specific brand_id, it concurrently fetches:

The transparent_png_url from products where SKU matches.

The active design_rules from campaigns where name matches "Saudi National Day".

The composition_rules from layout_rules where type is "hero_banner".

Payload Generation: The Next.js server concatenates these text rules into one bulletproof system prompt, attaches the raw PNG URL, and fires it off to your compositing API (like Photoroom).