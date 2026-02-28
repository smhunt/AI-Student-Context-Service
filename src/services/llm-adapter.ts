import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/index.js';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokenCountInput: number;
  tokenCountOutput: number;
  latencyMs: number;
}

export interface LLMProvider {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
}

class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    if (!config.claudeApiKey) {
      throw new Error('CLAUDE_API_KEY is not set');
    }
    this.client = new Anthropic({ apiKey: config.claudeApiKey });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // Extract system message (Anthropic API takes it as a separate param)
    const systemMessages = messages.filter((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const systemPrompt = systemMessages.map((m) => m.content).join('\n\n');

    const start = Date.now();
    const response = await this.client.messages.create({
      model: config.claudeModel,
      max_tokens: config.chatMaxTokens,
      temperature: config.chatTemperature,
      system: systemPrompt || undefined,
      messages: chatMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });
    const latencyMs = Date.now() - start;

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content,
      model: response.model,
      tokenCountInput: response.usage.input_tokens,
      tokenCountOutput: response.usage.output_tokens,
      latencyMs,
    };
  }
}

let cachedProvider: LLMProvider | null = null;

export function createLLMProvider(provider = 'claude'): LLMProvider {
  if (provider === 'claude' || provider === 'anthropic') {
    if (!cachedProvider) {
      cachedProvider = new ClaudeProvider();
    }
    return cachedProvider;
  }
  throw new Error(`Unsupported LLM provider: ${provider}. Currently only 'claude' is supported.`);
}
