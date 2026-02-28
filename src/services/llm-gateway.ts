import { createLLMProvider, type LLMMessage, type LLMResponse, type LLMProvider } from './llm-adapter.js';
import { estimateCost } from './llm-pricing.js';
import { recordTokenUsage } from '../db/queries/token-usage.js';
import { config } from '../config/index.js';

interface GatewayOptions {
  boardId: string;
  userId: string;
  sessionId?: string;
  provider?: string;
  requestType?: string;
}

/**
 * LLM Gateway — wraps providers with token tracking, cost estimation,
 * and per-board configuration.
 */
export class LLMGateway {
  private provider: LLMProvider;
  private providerName: string;

  constructor(options?: { provider?: string }) {
    this.providerName = options?.provider || config.llmProvider;
    this.provider = createLLMProvider(this.providerName);
  }

  async chat(messages: LLMMessage[], opts: GatewayOptions): Promise<LLMResponse> {
    const response = await this.provider.chat(messages);

    // Track token usage asynchronously (don't block response)
    this.trackUsage(response, opts).catch((err) =>
      console.error('[LLMGateway] Failed to track usage:', err)
    );

    return response;
  }

  async *chatStream(
    messages: LLMMessage[],
    opts: GatewayOptions,
  ): AsyncGenerator<string, LLMResponse> {
    if (!this.provider.chatStream) {
      // Fallback to non-streaming
      const response = await this.provider.chat(messages);
      yield response.content;
      await this.trackUsage(response, opts).catch(() => {});
      return response;
    }

    const stream = this.provider.chatStream(messages);
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
      await this.trackUsage(finalResponse, opts).catch(() => {});
    }

    return finalResponse!;
  }

  private async trackUsage(response: LLMResponse, opts: GatewayOptions): Promise<void> {
    const cost = estimateCost(response.model, response.tokenCountInput, response.tokenCountOutput);

    await recordTokenUsage({
      board_id: opts.boardId,
      user_id: opts.userId,
      session_id: opts.sessionId,
      provider: opts.provider || this.providerName,
      model: response.model,
      input_tokens: response.tokenCountInput,
      output_tokens: response.tokenCountOutput,
      cost_estimate_usd: cost,
      request_type: opts.requestType ?? 'chat',
    });
  }
}

/**
 * Create a gateway instance, optionally using board-specific LLM config.
 */
export function createGateway(provider?: string): LLMGateway {
  return new LLMGateway({ provider });
}
