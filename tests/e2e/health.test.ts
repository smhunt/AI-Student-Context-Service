import { describe, it, expect } from 'vitest';

const API = process.env.TEST_API_URL || 'https://localhost:3094';
const runE2E = process.env.TEST_E2E === 'true';
const describeE2E = runE2E ? describe : describe.skip;

describeE2E('E2E: Health Checks', () => {
  it('GET /health returns basic health status', async () => {
    const res = await fetch(`${API}/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
  });

  it('GET /health/detailed returns component status', async () => {
    const res = await fetch(`${API}/health/detailed`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBeDefined();
    expect(data.version).toBe('1.0.0');
    expect(data.checks.database).toBeDefined();
    expect(data.checks.embeddings).toBeDefined();
    expect(data.checks.llm_providers).toBeDefined();
    expect(data.checks.auth).toBeDefined();
    expect(data.uptime_seconds).toBeGreaterThan(0);
  });

  it('GET /v1/models returns model list (requires auth)', async () => {
    // First login
    const loginRes = await fetch(`${API}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@tvdsb.ca', password: 'devpassword123' }),
    });
    const { token } = await loginRes.json();

    const res = await fetch(`${API}/v1/models`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.object).toBe('list');
    expect(Array.isArray(data.data)).toBe(true);
  });
});
