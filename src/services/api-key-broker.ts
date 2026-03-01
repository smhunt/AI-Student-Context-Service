import { createLLMProvider, type LLMMessage, type LLMResponse } from './llm-adapter.js';
import { estimateCost } from './llm-pricing.js';
import { recordTokenUsage } from '../db/queries/token-usage.js';
import { getBoardLLMConfig, getCurrentPeriodUsage, type BoardLLMConfig } from '../db/queries/billing.js';
import { config } from '../config/index.js';

export interface BrokerOptions {
  boardId: string;
  userId: string;
  sessionId?: string;
  requestType?: string;
  preferredProvider?: string;
}

export interface BrokerResponse extends LLMResponse {
  billedCostUsd: number;
  provider: string;
  limitWarning?: string;
}

/**
 * API Key Broker — sits between context engine and LLM gateway.
 *
 * - Checks board limits (token + cost)
 * - Selects provider (board preferred, or fallback)
 * - Routes with EcoWorks' master keys (no board keys needed)
 * - Records usage with markup applied
 * - Returns 429 if limits exceeded
 */
export class APIKeyBroker {
  private configCache = new Map<string, { config: BoardLLMConfig; cachedAt: number }>();
  private static readonly CACHE_TTL_MS = 60_000; // 1 minute

  async chat(messages: LLMMessage[], opts: BrokerOptions): Promise<BrokerResponse> {
    const boardConfig = await this.getBoardConfig(opts.boardId);

    // Check limits
    await this.checkLimits(opts.boardId, boardConfig);

    // Select provider
    const providerName = this.selectProvider(opts.preferredProvider, boardConfig);
    const provider = createLLMProvider(providerName);

    // Execute chat
    const response = await provider.chat(messages);

    // Calculate billed cost (with markup)
    const rawCost = estimateCost(response.model, response.tokenCountInput, response.tokenCountOutput);
    const billedCost = rawCost * (boardConfig?.markup_multiplier ?? 1.5);

    // Track usage asynchronously
    this.trackUsage(response, rawCost, billedCost, providerName, opts).catch((err) =>
      console.error('[APIKeyBroker] Usage tracking failed:', err)
    );

    // Check if approaching limits
    const limitWarning = await this.checkWarningThreshold(opts.boardId, boardConfig);

    return {
      ...response,
      billedCostUsd: Math.round(billedCost * 1_000_000) / 1_000_000,
      provider: providerName,
      limitWarning: limitWarning ?? undefined,
    };
  }

  async *chatStream(
    messages: LLMMessage[],
    opts: BrokerOptions
  ): AsyncGenerator<string, BrokerResponse> {
    const boardConfig = await this.getBoardConfig(opts.boardId);
    await this.checkLimits(opts.boardId, boardConfig);

    const providerName = this.selectProvider(opts.preferredProvider, boardConfig);
    const provider = createLLMProvider(providerName);

    if (!provider.chatStream) {
      const response = await provider.chat(messages);
      yield response.content;
      const rawCost = estimateCost(response.model, response.tokenCountInput, response.tokenCountOutput);
      const billedCost = rawCost * (boardConfig?.markup_multiplier ?? 1.5);
      await this.trackUsage(response, rawCost, billedCost, providerName, opts).catch(() => {});
      return {
        ...response,
        billedCostUsd: Math.round(billedCost * 1_000_000) / 1_000_000,
        provider: providerName,
      };
    }

    const stream = provider.chatStream(messages);
    let finalResponse: LLMResponse | undefined;

    while (true) {
      const { value, done } = await stream.next();
      if (done) {
        finalResponse = value as LLMResponse;
        break;
      }
      yield value as string;
    }

    if (finalResponse) {
      const rawCost = estimateCost(finalResponse.model, finalResponse.tokenCountInput, finalResponse.tokenCountOutput);
      const billedCost = rawCost * (boardConfig?.markup_multiplier ?? 1.5);
      await this.trackUsage(finalResponse, rawCost, billedCost, providerName, opts).catch(() => {});

      const limitWarning = await this.checkWarningThreshold(opts.boardId, boardConfig);
      return {
        ...finalResponse,
        billedCostUsd: Math.round(billedCost * 1_000_000) / 1_000_000,
        provider: providerName,
        limitWarning: limitWarning ?? undefined,
      };
    }

    throw new Error('Stream ended without response');
  }

  private selectProvider(preferred: string | undefined, boardConfig: BoardLLMConfig | null): string {
    // Priority: explicit request > board preferred > global default
    if (preferred && this.isProviderAllowed(preferred, boardConfig)) {
      return preferred;
    }
    if (boardConfig?.preferred_provider && this.isProviderConfigured(boardConfig.preferred_provider)) {
      return boardConfig.preferred_provider;
    }
    return config.llmProvider;
  }

  private isProviderAllowed(provider: string, boardConfig: BoardLLMConfig | null): boolean {
    if (!boardConfig) return true; // No config = all allowed
    return boardConfig.allowed_providers.includes(provider);
  }

  private isProviderConfigured(provider: string): boolean {
    switch (provider) {
      case 'claude': return !!config.claudeApiKey;
      case 'openai': return !!config.openaiChatApiKey;
      case 'gemini': return !!config.geminiApiKey;
      case 'llama': return !!config.groqApiKey;
      case 'mistral': return !!config.mistralApiKey;
      default: return false;
    }
  }

  private async getBoardConfig(boardId: string): Promise<BoardLLMConfig | null> {
    const cached = this.configCache.get(boardId);
    if (cached && Date.now() - cached.cachedAt < APIKeyBroker.CACHE_TTL_MS) {
      return cached.config;
    }

    const boardConfig = await getBoardLLMConfig(boardId);
    if (boardConfig) {
      this.configCache.set(boardId, { config: boardConfig, cachedAt: Date.now() });
    }
    return boardConfig;
  }

  private async checkLimits(boardId: string, boardConfig: BoardLLMConfig | null): Promise<void> {
    if (!boardConfig) return; // No config = no limits

    const usage = await getCurrentPeriodUsage(boardId);

    // Check token limit
    if (boardConfig.monthly_token_limit && usage.total_tokens >= boardConfig.monthly_token_limit) {
      throw new BillingLimitError(
        `Monthly token limit reached (${usage.total_tokens.toLocaleString()} / ${boardConfig.monthly_token_limit.toLocaleString()})`
      );
    }

    // Check cost limit
    if (boardConfig.monthly_cost_limit_usd && usage.total_billed_usd >= boardConfig.monthly_cost_limit_usd) {
      throw new BillingLimitError(
        `Monthly cost limit reached ($${usage.total_billed_usd.toFixed(2)} / $${boardConfig.monthly_cost_limit_usd.toFixed(2)})`
      );
    }
  }

  private async checkWarningThreshold(
    boardId: string,
    boardConfig: BoardLLMConfig | null
  ): Promise<string | null> {
    if (!boardConfig) return null;

    const usage = await getCurrentPeriodUsage(boardId);
    const warnings: string[] = [];

    if (boardConfig.monthly_token_limit) {
      const tokenPct = usage.total_tokens / boardConfig.monthly_token_limit;
      if (tokenPct >= 0.9) {
        warnings.push(`Token usage at ${Math.round(tokenPct * 100)}% of monthly limit`);
      }
    }

    if (boardConfig.monthly_cost_limit_usd) {
      const costPct = usage.total_billed_usd / boardConfig.monthly_cost_limit_usd;
      if (costPct >= 0.9) {
        warnings.push(`Cost at ${Math.round(costPct * 100)}% of monthly limit ($${usage.total_billed_usd.toFixed(2)} / $${boardConfig.monthly_cost_limit_usd.toFixed(2)})`);
      }
    }

    return warnings.length > 0 ? warnings.join('; ') : null;
  }

  private async trackUsage(
    response: LLMResponse,
    rawCost: number,
    billedCost: number,
    providerName: string,
    opts: BrokerOptions
  ): Promise<void> {
    await recordTokenUsage({
      board_id: opts.boardId,
      user_id: opts.userId,
      session_id: opts.sessionId,
      provider: providerName,
      model: response.model,
      input_tokens: response.tokenCountInput,
      output_tokens: response.tokenCountOutput,
      cost_estimate_usd: rawCost,
      request_type: opts.requestType ?? 'chat',
    });

    // Update billed cost (the recordTokenUsage sets cost_estimate_usd, we update billed separately)
    const { query: dbQuery } = await import('../db/index.js');
    await dbQuery(
      `UPDATE token_usage SET billed_cost_usd = $1
       WHERE board_id = $2 AND user_id = $3
       AND created_at = (SELECT MAX(created_at) FROM token_usage WHERE board_id = $2 AND user_id = $3)`,
      [billedCost, opts.boardId, opts.userId]
    );
  }
}

export class BillingLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BillingLimitError';
  }
}

let _broker: APIKeyBroker | null = null;

export function getBroker(): APIKeyBroker {
  if (!_broker) _broker = new APIKeyBroker();
  return _broker;
}
