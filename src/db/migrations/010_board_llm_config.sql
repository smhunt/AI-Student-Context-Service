-- Sprint 14: Board LLM Configuration & Billing
-- Boards never need their own LLM keys. EcoWorks holds master keys,
-- proxies requests, marks up costs, and enforces limits.

DO $$ BEGIN
  CREATE TYPE billing_plan AS ENUM ('pilot', 'standard', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE board_llm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  allowed_providers TEXT[] NOT NULL DEFAULT ARRAY['claude', 'openai'],
  preferred_provider TEXT NOT NULL DEFAULT 'claude',
  monthly_token_limit BIGINT DEFAULT 10000000,        -- 10M tokens default
  monthly_cost_limit_usd NUMERIC(10, 2) DEFAULT 500.00,
  markup_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.50,
  billing_plan billing_plan NOT NULL DEFAULT 'pilot',
  rate_limit_rpm INTEGER DEFAULT 60,                   -- requests per minute
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(board_id)
);

-- Add billed_cost column to token_usage for markup-applied costs
ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS billed_cost_usd NUMERIC(12, 6) DEFAULT 0;

-- Index for billing period queries
CREATE INDEX IF NOT EXISTS idx_token_usage_billing_period
  ON token_usage (board_id, created_at DESC);

-- Seed default config for TVDSB
INSERT INTO board_llm_config (board_id, allowed_providers, preferred_provider, billing_plan)
SELECT id, ARRAY['claude', 'openai', 'gemini'], 'claude', 'pilot'
FROM boards
WHERE slug = 'tvdsb'
ON CONFLICT (board_id) DO NOTHING;
