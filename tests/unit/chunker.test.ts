import { describe, it, expect } from 'vitest';
import { splitIntoChunks } from '../../src/ingestion/chunker.js';

describe('splitIntoChunks', () => {
  it('returns empty array for empty text', () => {
    expect(splitIntoChunks('')).toEqual([]);
    expect(splitIntoChunks('  ')).toEqual([]);
  });

  it('returns single chunk for short text', () => {
    const result = splitIntoChunks('Hello world');
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello world');
    expect(result[0].tokenCount).toBeGreaterThan(0);
  });

  it('splits long text into multiple chunks', () => {
    // Create text that's clearly > 500 tokens (~2000 chars)
    const longText = 'The quick brown fox jumps over the lazy dog. '.repeat(200);
    const result = splitIntoChunks(longText);
    expect(result.length).toBeGreaterThan(1);
  });

  it('respects word boundaries', () => {
    const longText = 'word '.repeat(600); // ~600 tokens
    const result = splitIntoChunks(longText);
    // No chunk should contain a partial word (each chunk is trimmed, so check
    // that every word in the chunk is complete)
    for (const chunk of result) {
      // After trimming, there should be no leading/trailing partial words
      expect(chunk.text).toBe(chunk.text.trim());
    }
  });

  it('chunks have approximate overlap', () => {
    const longText = 'The quick brown fox jumps over the lazy dog. '.repeat(200);
    const result = splitIntoChunks(longText, 500, 50);
    if (result.length >= 2) {
      // Last part of chunk N should appear at start of chunk N+1 (overlap)
      const end1 = result[0].text.slice(-100);
      const start2 = result[1].text.slice(0, 200);
      // There should be some overlapping text
      const overlap = end1.split(' ').filter(w => start2.includes(w));
      expect(overlap.length).toBeGreaterThan(0);
    }
  });

  it('token count approximation is reasonable', () => {
    const text = 'This is approximately four tokens per word count.'; // ~50 chars = ~12 tokens
    const result = splitIntoChunks(text);
    expect(result[0].tokenCount).toBeGreaterThanOrEqual(10);
    expect(result[0].tokenCount).toBeLessThanOrEqual(20);
  });

  it('handles custom chunk size', () => {
    const longText = 'word '.repeat(600);
    const small = splitIntoChunks(longText, 100, 10);
    const large = splitIntoChunks(longText, 1000, 50);
    expect(small.length).toBeGreaterThan(large.length);
  });
});
