import { describe, it, expect, beforeAll } from 'vitest';

const API = process.env.TEST_API_URL || 'https://localhost:3094';

// Skip E2E tests unless TEST_E2E=true
const runE2E = process.env.TEST_E2E === 'true';
const describeE2E = runE2E ? describe : describe.skip;

describeE2E('E2E: Auth Flow', () => {
  let token: string;

  it('GET /api/auth/provider returns the active provider', async () => {
    const res = await fetch(`${API}/api/auth/provider`, {
      headers: { Accept: 'application/json' },
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.provider).toBeDefined();
    expect(['dev', 'clerk', 'entra', 'google']).toContain(data.provider);
  });

  it('POST /api/auth/dev-login authenticates with valid credentials', async () => {
    const res = await fetch(`${API}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@tvdsb.ca', password: 'devpassword123' }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe('teacher@tvdsb.ca');
    expect(data.user.role).toBe('teacher');
    token = data.token;
  });

  it('GET /api/auth/me returns authenticated user profile', async () => {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.email).toBe('teacher@tvdsb.ca');
    expect(data.role).toBe('teacher');
  });

  it('GET /api/auth/me rejects invalid token', async () => {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect(res.status).toBe(401);
  });
});
