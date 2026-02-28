-- Token usage tracking for LLM Gateway billing
CREATE TABLE IF NOT EXISTS token_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID NOT NULL REFERENCES boards(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  session_id  UUID REFERENCES chat_sessions(id),
  provider    TEXT NOT NULL,
  model       TEXT NOT NULL,
  input_tokens   INTEGER NOT NULL DEFAULT 0,
  output_tokens  INTEGER NOT NULL DEFAULT 0,
  total_tokens   INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost_estimate_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  request_type TEXT NOT NULL DEFAULT 'chat',  -- 'chat', 'embedding', 'report_comment'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient aggregation queries
CREATE INDEX IF NOT EXISTS idx_token_usage_board_created
  ON token_usage (board_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_usage_user_created
  ON token_usage (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_usage_provider
  ON token_usage (provider, created_at DESC);
