-- Add SIS provider configuration to boards table
ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS sis_provider TEXT NOT NULL DEFAULT 'mock',
  ADD COLUMN IF NOT EXISTS sis_config JSONB NOT NULL DEFAULT '{}';

-- Comment: sis_config stores provider-specific settings like:
-- { "base_url": "https://aspen.tvdsb.on.ca/api", "client_id": "...", "client_secret": "..." }
