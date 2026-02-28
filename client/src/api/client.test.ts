import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getToken, setToken, clearToken } from './client.js';

// Mock localStorage
const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, val: string) => storage.set(key, val),
  removeItem: (key: string) => storage.delete(key),
});

describe('Token management', () => {
  beforeEach(() => storage.clear());

  it('getToken returns null when no token stored', () => {
    expect(getToken()).toBeNull();
  });

  it('setToken stores and retrieves token', () => {
    setToken('test-jwt-123');
    expect(getToken()).toBe('test-jwt-123');
  });

  it('clearToken removes stored token', () => {
    setToken('test-jwt-123');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('setToken overwrites previous token', () => {
    setToken('first-token');
    setToken('second-token');
    expect(getToken()).toBe('second-token');
  });

  it('clearToken is safe when no token exists', () => {
    clearToken();
    expect(getToken()).toBeNull();
  });
});
