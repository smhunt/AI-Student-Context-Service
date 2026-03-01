import { describe, it, expect, beforeAll } from 'vitest';

const API = process.env.TEST_API_URL || 'https://localhost:3094';
const runE2E = process.env.TEST_E2E === 'true';
const describeE2E = runE2E ? describe : describe.skip;

describeE2E('E2E: Billing Flow', () => {
  let adminToken: string;

  beforeAll(async () => {
    const res = await fetch(`${API}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@tvdsb.ca', password: 'devpassword123' }),
    });
    adminToken = (await res.json()).token;
  });

  it('GET /api/admin/billing returns current billing period', async () => {
    const res = await fetch(`${API}/api/admin/billing`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.billing_plan).toBeDefined();
    expect(data.current_period).toBeDefined();
    expect(data.current_period.total_tokens).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/admin/billing/history returns historical data', async () => {
    const res = await fetch(`${API}/api/admin/billing/history`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data.history)).toBe(true);
  });

  it('GET /api/admin/usage returns token usage stats', async () => {
    const res = await fetch(`${API}/api/admin/usage`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.stats).toBeDefined();
    expect(data.stats.total_requests).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/admin/llm-providers returns configured providers', async () => {
    const res = await fetch(`${API}/api/admin/llm-providers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.providers).toBeDefined();
  });
});
