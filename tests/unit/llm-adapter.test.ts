import { describe, it, expect } from 'vitest';
import { getAvailableProviders } from '../../src/services/llm-adapter.js';

describe('LLM Adapter', () => {
  it('getAvailableProviders returns all 5 providers', () => {
    const providers = getAvailableProviders();
    expect(providers).toHaveLength(5);
    const names = providers.map(p => p.name);
    expect(names).toContain('claude');
    expect(names).toContain('openai');
    expect(names).toContain('gemini');
    expect(names).toContain('llama');
    expect(names).toContain('mistral');
  });

  it('each provider has configured boolean', () => {
    const providers = getAvailableProviders();
    for (const p of providers) {
      expect(typeof p.configured).toBe('boolean');
    }
  });
});
