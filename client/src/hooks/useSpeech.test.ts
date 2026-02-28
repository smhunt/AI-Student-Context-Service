import { describe, it, expect } from 'vitest';
import { stripMarkdown, splitIntoSpeechChunks } from './useSpeech.js';

describe('stripMarkdown', () => {
  it('removes fenced code blocks', () => {
    expect(stripMarkdown('Hello ```const x = 1;``` world')).toBe('Hello  world');
  });

  it('removes inline code but keeps text', () => {
    expect(stripMarkdown('Use `console.log` here')).toBe('Use console.log here');
  });

  it('removes bold markers', () => {
    expect(stripMarkdown('**bold** text')).toBe('bold text');
  });

  it('removes italic markers (asterisks)', () => {
    expect(stripMarkdown('*italic* text')).toBe('italic text');
  });

  it('removes italic markers (underscores)', () => {
    expect(stripMarkdown('_italic_ text')).toBe('italic text');
  });

  it('removes links keeping text', () => {
    expect(stripMarkdown('[click here](http://example.com)')).toBe('click here');
  });

  it('removes image markdown entirely', () => {
    expect(stripMarkdown('![alt text](http://img.png)')).toBe('');
  });

  it('removes heading markers', () => {
    expect(stripMarkdown('## Heading\nContent')).toBe('Heading\nContent');
  });

  it('removes bullet markers', () => {
    expect(stripMarkdown('- item 1\n- item 2')).toBe('item 1\nitem 2');
  });

  it('removes numbered list markers', () => {
    expect(stripMarkdown('1. first\n2. second')).toBe('first\nsecond');
  });

  it('removes blockquote markers', () => {
    expect(stripMarkdown('> quoted text')).toBe('quoted text');
  });

  it('collapses multiple newlines', () => {
    expect(stripMarkdown('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('trims leading and trailing whitespace', () => {
    expect(stripMarkdown('  hello  ')).toBe('hello');
  });
});

describe('splitIntoSpeechChunks', () => {
  it('returns single chunk for short text', () => {
    const chunks = splitIntoSpeechChunks('Hello world.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('Hello world.');
  });

  it('keeps short text in one chunk', () => {
    const text = 'This is a short sentence. And another one.';
    const chunks = splitIntoSpeechChunks(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('splits long text at sentence boundaries', () => {
    // Build text with >200 words by repeating sentences
    const sentence = 'This is a test sentence with several words in it. ';
    const longText = sentence.repeat(50); // ~500 words
    const chunks = splitIntoSpeechChunks(longText);
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should end with a period followed by optional whitespace
    for (const chunk of chunks) {
      expect(chunk.trim()).toMatch(/[.!?]\s*$/);
    }
  });

  it('handles text without sentence-ending punctuation', () => {
    const text = 'No punctuation here';
    const chunks = splitIntoSpeechChunks(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('returns empty array for empty string', () => {
    const chunks = splitIntoSpeechChunks('');
    expect(chunks).toHaveLength(0);
  });
});
