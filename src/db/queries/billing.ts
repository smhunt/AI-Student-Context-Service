import { query } from '../index.js';

export interface BoardLLMConfig {
  id: string;
  board_id: string;
  allowed_providers: string[];
  preferred_provider: string;
  monthly_token_limit: number;
  monthly_cost_limit_usd: number;
  markup_multiplier: number;
  billing_plan: 'pilot' | 'standard' | 'enterprise';
  rate_limit_rpm: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function getBoardLLMConfig(boardId: string): Promise<BoardLLMConfig | null> {
  const result = await query<BoardLLMConfig>(
    `SELECT * FROM board_llm_config WHERE board_id = $1`,
    [boardId]
  );
  return result.rows[0] ?? null;
}

export async function upsertBoardLLMConfig(
  boardId: string,
  updates: Partial<Pick<BoardLLMConfig,
    'allowed_providers' | 'preferred_provider' | 'monthly_token_limit' |
    'monthly_cost_limit_usd' | 'markup_multiplier' | 'billing_plan' |
    'rate_limit_rpm' | 'notes'
  >>
): Promise<BoardLLMConfig> {
  const result = await query<BoardLLMConfig>(
    `INSERT INTO board_llm_config (board_id, allowed_providers, preferred_provider,
       monthly_token_limit, monthly_cost_limit_usd, markup_multiplier, billing_plan,
       rate_limit_rpm, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (board_id) DO UPDATE SET
       allowed_providers = COALESCE($2, board_llm_config.allowed_providers),
       preferred_provider = COALESCE($3, board_llm_config.preferred_provider),
       monthly_token_limit = COALESCE($4, board_llm_config.monthly_token_limit),
       monthly_cost_limit_usd = COALESCE($5, board_llm_config.monthly_cost_limit_usd),
       markup_multiplier = COALESCE($6, board_llm_config.markup_multiplier),
       billing_plan = COALESCE($7, board_llm_config.billing_plan),
       rate_limit_rpm = COALESCE($8, board_llm_config.rate_limit_rpm),
       notes = COALESCE($9, board_llm_config.notes),
       updated_at = NOW()
     RETURNING *`,
    [
      boardId,
      updates.allowed_providers ?? ['claude', 'openai'],
      updates.preferred_provider ?? 'claude',
      updates.monthly_token_limit ?? 10_000_000,
      updates.monthly_cost_limit_usd ?? 500,
      updates.markup_multiplier ?? 1.5,
      updates.billing_plan ?? 'pilot',
      updates.rate_limit_rpm ?? 60,
      updates.notes ?? null,
    ]
  );
  return result.rows[0];
}

export interface BillingPeriodUsage {
  total_tokens: number;
  total_cost_usd: number;
  total_billed_usd: number;
  request_count: number;
}

export async function getCurrentPeriodUsage(boardId: string): Promise<BillingPeriodUsage> {
  const result = await query<{
    total_tokens: string;
    total_cost_usd: string;
    total_billed_usd: string;
    request_count: string;
  }>(
    `SELECT
       COALESCE(SUM(input_tokens + output_tokens), 0)::text AS total_tokens,
       COALESCE(SUM(cost_estimate_usd), 0)::text AS total_cost_usd,
       COALESCE(SUM(billed_cost_usd), 0)::text AS total_billed_usd,
       COUNT(*)::text AS request_count
     FROM token_usage
     WHERE board_id = $1
       AND created_at >= date_trunc('month', NOW())`,
    [boardId]
  );

  const row = result.rows[0];
  return {
    total_tokens: parseInt(row.total_tokens, 10),
    total_cost_usd: parseFloat(row.total_cost_usd),
    total_billed_usd: parseFloat(row.total_billed_usd),
    request_count: parseInt(row.request_count, 10),
  };
}

export interface MonthlyBillingSummary {
  month: string;
  total_tokens: number;
  total_cost_usd: number;
  total_billed_usd: number;
  request_count: number;
  by_provider: { provider: string; tokens: number; cost: number; billed: number }[];
}

export async function getBillingHistory(
  boardId: string,
  months: number = 12
): Promise<MonthlyBillingSummary[]> {
  const [monthlies, providerBreakdown] = await Promise.all([
    query<{
      month: string;
      total_tokens: string;
      total_cost_usd: string;
      total_billed_usd: string;
      request_count: string;
    }>(
      `SELECT
         to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
         COALESCE(SUM(input_tokens + output_tokens), 0)::text AS total_tokens,
         COALESCE(SUM(cost_estimate_usd), 0)::text AS total_cost_usd,
         COALESCE(SUM(billed_cost_usd), 0)::text AS total_billed_usd,
         COUNT(*)::text AS request_count
       FROM token_usage
       WHERE board_id = $1
         AND created_at >= NOW() - ($2 || ' months')::interval
       GROUP BY date_trunc('month', created_at)
       ORDER BY month DESC`,
      [boardId, months]
    ),
    query<{
      month: string;
      provider: string;
      tokens: string;
      cost: string;
      billed: string;
    }>(
      `SELECT
         to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
         provider,
         COALESCE(SUM(input_tokens + output_tokens), 0)::text AS tokens,
         COALESCE(SUM(cost_estimate_usd), 0)::text AS cost,
         COALESCE(SUM(billed_cost_usd), 0)::text AS billed
       FROM token_usage
       WHERE board_id = $1
         AND created_at >= NOW() - ($2 || ' months')::interval
       GROUP BY date_trunc('month', created_at), provider
       ORDER BY month DESC, cost DESC`,
      [boardId, months]
    ),
  ]);

  // Group provider breakdown by month
  const providersByMonth = new Map<string, MonthlyBillingSummary['by_provider']>();
  for (const row of providerBreakdown.rows) {
    const list = providersByMonth.get(row.month) ?? [];
    list.push({
      provider: row.provider,
      tokens: parseInt(row.tokens, 10),
      cost: parseFloat(row.cost),
      billed: parseFloat(row.billed),
    });
    providersByMonth.set(row.month, list);
  }

  return monthlies.rows.map((row) => ({
    month: row.month,
    total_tokens: parseInt(row.total_tokens, 10),
    total_cost_usd: parseFloat(row.total_cost_usd),
    total_billed_usd: parseFloat(row.total_billed_usd),
    request_count: parseInt(row.request_count, 10),
    by_provider: providersByMonth.get(row.month) ?? [],
  }));
}
