import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { Mistral } from '@mistralai/mistralai';
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
  chatStream?(messages: LLMMessage[]): AsyncGenerator<string, LLMResponse>;
}

// ---------------------------------------------------------------------------
// Claude (Anthropic)
// ---------------------------------------------------------------------------
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

  async *chatStream(messages: LLMMessage[]): AsyncGenerator<string, LLMResponse> {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');
    const systemPrompt = systemMessages.map((m) => m.content).join('\n\n');

    const start = Date.now();
    const stream = this.client.messages.stream({
      model: config.claudeModel,
      max_tokens: config.chatMaxTokens,
      temperature: config.chatTemperature,
      system: systemPrompt || undefined,
      messages: chatMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    let fullContent = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullContent += event.delta.text;
        yield event.delta.text;
      }
    }

    const final = await stream.finalMessage();
    const latencyMs = Date.now() - start;
    return {
      content: fullContent,
      model: final.model,
      tokenCountInput: final.usage.input_tokens,
      tokenCountOutput: final.usage.output_tokens,
      latencyMs,
    };
  }
}

// ---------------------------------------------------------------------------
// OpenAI (GPT-4o, etc.)
// ---------------------------------------------------------------------------
class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    if (!config.openaiChatApiKey) {
      throw new Error(
        'OPENAI_CHAT_API_KEY (or OPENAI_API_KEY) is not set. Required for OpenAI chat provider.'
      );
    }
    this.client = new OpenAI({ apiKey: config.openaiChatApiKey });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: config.openaiChatModel,
      max_tokens: config.chatMaxTokens,
      temperature: config.chatTemperature,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const latencyMs = Date.now() - start;

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      tokenCountInput: response.usage?.prompt_tokens || 0,
      tokenCountOutput: response.usage?.completion_tokens || 0,
      latencyMs,
    };
  }

  async *chatStream(messages: LLMMessage[]): AsyncGenerator<string, LLMResponse> {
    const start = Date.now();
    const stream = await this.client.chat.completions.create({
      model: config.openaiChatModel,
      max_tokens: config.chatMaxTokens,
      temperature: config.chatTemperature,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      stream_options: { include_usage: true },
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let model = config.openaiChatModel;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        yield delta;
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens || 0;
        outputTokens = chunk.usage.completion_tokens || 0;
      }
      if (chunk.model) model = chunk.model;
    }

    const latencyMs = Date.now() - start;
    return {
      content: fullContent,
      model,
      tokenCountInput: inputTokens,
      tokenCountOutput: outputTokens,
      latencyMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Google Gemini
// ---------------------------------------------------------------------------
class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;

  constructor() {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set. Required for Gemini chat provider.');
    }
    this.client = new GoogleGenerativeAI(config.geminiApiKey);
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // Extract system instruction separately — Gemini takes it as a model param
    const systemMessages = messages.filter((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');
    const systemInstruction = systemMessages.map((m) => m.content).join('\n\n');

    const model = this.client.getGenerativeModel({
      model: config.geminiModel,
      generationConfig: {
        maxOutputTokens: config.chatMaxTokens,
        temperature: config.chatTemperature,
      },
      ...(systemInstruction ? { systemInstruction } : {}),
    });

    // Convert to Gemini message format: 'assistant' -> 'model'
    const geminiContents = chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const start = Date.now();
    const result = await model.generateContent({ contents: geminiContents });
    const latencyMs = Date.now() - start;

    const response = result.response;
    const text = response.text();
    const usage = response.usageMetadata;

    return {
      content: text,
      model: config.geminiModel,
      tokenCountInput: usage?.promptTokenCount || 0,
      tokenCountOutput: usage?.candidatesTokenCount || 0,
      latencyMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Groq (Meta Llama) — OpenAI-compatible API
// ---------------------------------------------------------------------------
class GroqProvider implements LLMProvider {
  private client: Groq;

  constructor() {
    if (!config.groqApiKey) {
      throw new Error('GROQ_API_KEY is not set. Required for Groq/Llama chat provider.');
    }
    this.client = new Groq({ apiKey: config.groqApiKey });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: config.groqModel,
      max_tokens: config.chatMaxTokens,
      temperature: config.chatTemperature,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const latencyMs = Date.now() - start;

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      tokenCountInput: response.usage?.prompt_tokens || 0,
      tokenCountOutput: response.usage?.completion_tokens || 0,
      latencyMs,
    };
  }

  async *chatStream(messages: LLMMessage[]): AsyncGenerator<string, LLMResponse> {
    const start = Date.now();
    const stream = await this.client.chat.completions.create({
      model: config.groqModel,
      max_tokens: config.chatMaxTokens,
      temperature: config.chatTemperature,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    });

    let fullContent = '';
    let model = config.groqModel;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        yield delta;
      }
      if (chunk.model) model = chunk.model;
    }

    const latencyMs = Date.now() - start;
    // Groq doesn't return usage in stream — use non-stream response for final counts
    return {
      content: fullContent,
      model,
      tokenCountInput: 0,
      tokenCountOutput: 0,
      latencyMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Mistral
// ---------------------------------------------------------------------------
class MistralProvider implements LLMProvider {
  private client: Mistral;

  constructor() {
    if (!config.mistralApiKey) {
      throw new Error('MISTRAL_API_KEY is not set. Required for Mistral chat provider.');
    }
    this.client = new Mistral({ apiKey: config.mistralApiKey });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const start = Date.now();
    const response = await this.client.chat.complete({
      model: config.mistralModel,
      maxTokens: config.chatMaxTokens,
      temperature: config.chatTemperature,
      messages: messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
    });
    const latencyMs = Date.now() - start;

    // Mistral content can be string or ContentChunk[] — extract text
    const rawContent = response.choices?.[0]?.message?.content;
    const content = typeof rawContent === 'string'
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent.map((chunk) => ('text' in chunk ? chunk.text : '')).join('')
        : '';

    return {
      content,
      model: response.model || config.mistralModel,
      tokenCountInput: response.usage?.promptTokens || 0,
      tokenCountOutput: response.usage?.completionTokens || 0,
      latencyMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Provider factory with caching
// ---------------------------------------------------------------------------
const providerCache = new Map<string, LLMProvider>();

export function createLLMProvider(provider?: string): LLMProvider {
  const name = provider || config.llmProvider;

  if (providerCache.has(name)) return providerCache.get(name)!;

  let instance: LLMProvider;
  switch (name) {
    case 'claude':
    case 'anthropic':
      instance = new ClaudeProvider();
      break;
    case 'openai':
    case 'gpt':
      instance = new OpenAIProvider();
      break;
    case 'gemini':
    case 'google':
      instance = new GeminiProvider();
      break;
    case 'llama':
    case 'groq':
    case 'meta':
      instance = new GroqProvider();
      break;
    case 'mistral':
      instance = new MistralProvider();
      break;
    default:
      throw new Error(
        `Unsupported LLM provider: ${name}. Supported: claude, openai, gemini, llama, mistral`
      );
  }

  providerCache.set(name, instance);
  return instance;
}

export function getAvailableProviders(): { name: string; configured: boolean }[] {
  return [
    { name: 'claude', configured: !!config.claudeApiKey },
    { name: 'openai', configured: !!config.openaiChatApiKey },
    { name: 'gemini', configured: !!config.geminiApiKey },
    { name: 'llama', configured: !!config.groqApiKey },
    { name: 'mistral', configured: !!config.mistralApiKey },
  ];
}
