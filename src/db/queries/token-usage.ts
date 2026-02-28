import { query } from '../index.js';

export interface TokenUsageRecord {
  id: string;
  board_id: string;
  user_id: string;
  session_id: string | null;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_estimate_usd: number;
  request_type: string;
  created_at: Date;
}

export async function recordTokenUsage(params: {
  board_id: string;
  user_id: string;
  session_id?: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_estimate_usd: number;
  request_type?: string;
}): Promise<TokenUsageRecord> {
  const result = await query<TokenUsageRecord>(
    `INSERT INTO token_usage (board_id, user_id, session_id, provider, model, input_tokens, output_tokens, cost_estimate_usd, request_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      params.board_id,
      params.user_id,
      params.session_id ?? null,
      params.provider,
      params.model,
      params.input_tokens,
      params.output_tokens,
      params.cost_estimate_usd,
      params.request_type ?? 'chat',
    ]
  );
  return result.rows[0];
}

export interface UsageStats {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  by_provider: { provider: string; requests: number; tokens: number; cost: number }[];
  by_model: { model: string; requests: number; tokens: number; cost: number }[];
  daily: { date: string; requests: number; tokens: number; cost: number }[];
}

export async function getUsageStats(
  boardId: string,
  days: number = 30
): Promise<UsageStats> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const [totals, byProvider, byModel, daily] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total_requests,
              COALESCE(SUM(input_tokens), 0)::int AS total_input_tokens,
              COALESCE(SUM(output_tokens), 0)::int AS total_output_tokens,
              COALESCE(SUM(cost_estimate_usd), 0)::numeric AS total_cost_usd
       FROM token_usage WHERE board_id = $1 AND created_at >= $2`,
      [boardId, cutoff]
    ),
    query(
      `SELECT provider,
              COUNT(*)::int AS requests,
              COALESCE(SUM(input_tokens + output_tokens), 0)::int AS tokens,
              COALESCE(SUM(cost_estimate_usd), 0)::numeric AS cost
       FROM token_usage WHERE board_id = $1 AND created_at >= $2
       GROUP BY provider ORDER BY cost DESC`,
      [boardId, cutoff]
    ),
    query(
      `SELECT model,
              COUNT(*)::int AS requests,
              COALESCE(SUM(input_tokens + output_tokens), 0)::int AS tokens,
              COALESCE(SUM(cost_estimate_usd), 0)::numeric AS cost
       FROM token_usage WHERE board_id = $1 AND created_at >= $2
       GROUP BY model ORDER BY cost DESC`,
      [boardId, cutoff]
    ),
    query(
      `SELECT DATE(created_at)::text AS date,
              COUNT(*)::int AS requests,
              COALESCE(SUM(input_tokens + output_tokens), 0)::int AS tokens,
              COALESCE(SUM(cost_estimate_usd), 0)::numeric AS cost
       FROM token_usage WHERE board_id = $1 AND created_at >= $2
       GROUP BY DATE(created_at) ORDER BY date DESC`,
      [boardId, cutoff]
    ),
  ]);

  const t = totals.rows[0];
  return {
    total_requests: t?.total_requests || 0,
    total_input_tokens: t?.total_input_tokens || 0,
    total_output_tokens: t?.total_output_tokens || 0,
    total_cost_usd: parseFloat(t?.total_cost_usd || '0'),
    by_provider: byProvider.rows.map((r: any) => ({
      provider: r.provider,
      requests: r.requests,
      tokens: r.tokens,
      cost: parseFloat(r.cost),
    })),
    by_model: byModel.rows.map((r: any) => ({
      model: r.model,
      requests: r.requests,
      tokens: r.tokens,
      cost: parseFloat(r.cost),
    })),
    daily: daily.rows.map((r: any) => ({
      date: r.date,
      requests: r.requests,
      tokens: r.tokens,
      cost: parseFloat(r.cost),
    })),
  };
}
