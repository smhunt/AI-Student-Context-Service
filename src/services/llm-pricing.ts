/**
 * LLM pricing tables (per-token USD costs).
 * Updated as of Feb 2026. Prices are per 1M tokens.
 */

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

const PRICING: Record<string, ModelPricing> = {
  // Claude
  'claude-sonnet-4-20250514': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-haiku-4-5-20251001': { inputPer1M: 0.80, outputPer1M: 4.0 },
  'claude-opus-4-6': { inputPer1M: 15.0, outputPer1M: 75.0 },

  // OpenAI
  'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.0 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60 },

  // Google Gemini
  'gemini-2.0-flash': { inputPer1M: 0.10, outputPer1M: 0.40 },
  'gemini-2.0-flash-lite': { inputPer1M: 0.075, outputPer1M: 0.30 },

  // Groq (Meta Llama)
  'llama-3.3-70b-versatile': { inputPer1M: 0.59, outputPer1M: 0.79 },

  // Mistral
  'mistral-large-latest': { inputPer1M: 2.0, outputPer1M: 6.0 },
  'mistral-small-latest': { inputPer1M: 0.20, outputPer1M: 0.60 },

  // Embeddings
  'text-embedding-3-small': { inputPer1M: 0.02, outputPer1M: 0 },
};

/**
 * Estimate cost in USD for a request's token usage.
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

export function getModelPricing(model: string): ModelPricing | null {
  return PRICING[model] || null;
}
