import { describe, it, expect, beforeAll } from 'vitest';

// Integration tests run against the already-running dev server.
// Skip SSL verification for self-signed certs.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE = 'https://localhost:3094';

// Check if the dev server is reachable before running tests
let serverAvailable = false;

async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

describe('Auth API (integration)', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
    if (!serverAvailable) {
      console.warn('Dev server not running at ' + BASE + ' — skipping integration tests');
    }
  });

  it('POST /api/auth/dev-login with valid credentials returns token', async ({ skip }) => {
    if (!serverAvailable) skip();
    const res = await fetch(`${BASE}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex.johnson@tvdsb.on.ca', password: 'devpassword123' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(body.user.role).toBe('student');
  });

  it('POST /api/auth/dev-login with wrong password returns 401', async ({ skip }) => {
    if (!serverAvailable) skip();
    const res = await fetch(`${BASE}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex.johnson@tvdsb.on.ca', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me without token returns 401', async ({ skip }) => {
    if (!serverAvailable) skip();
    const res = await fetch(`${BASE}/api/auth/me`);
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me with valid token returns user', async ({ skip }) => {
    if (!serverAvailable) skip();
    const loginRes = await fetch(`${BASE}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah.chen@tvdsb.on.ca', password: 'devpassword123' }),
    });
    const loginBody = await loginRes.json();

    const res = await fetch(`${BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${loginBody.token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe('teacher');
  });

  it('GET /health returns healthy', async ({ skip }) => {
    if (!serverAvailable) skip();
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
  });
});
