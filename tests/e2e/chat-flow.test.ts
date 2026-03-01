import { describe, it, expect, beforeAll } from 'vitest';

const API = process.env.TEST_API_URL || 'https://localhost:3094';
const runE2E = process.env.TEST_E2E === 'true';
const describeE2E = runE2E ? describe : describe.skip;

describeE2E('E2E: Chat Flow', () => {
  let teacherToken: string;
  let studentToken: string;

  beforeAll(async () => {
    // Login as teacher
    const teacherRes = await fetch(`${API}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@tvdsb.ca', password: 'devpassword123' }),
    });
    teacherToken = (await teacherRes.json()).token;

    // Login as student
    const studentRes = await fetch(`${API}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@tvdsb.ca', password: 'devpassword123' }),
    });
    studentToken = (await studentRes.json()).token;
  });

  it('POST /api/chat/message sends a student chat message', async () => {
    const res = await fetch(`${API}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ query: 'What am I learning in math?' }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.content).toBeDefined();
    expect(data.sessionId).toBeDefined();
    expect(data.model).toBeDefined();
  });

  it('GET /api/chat/sessions lists user sessions', async () => {
    const res = await fetch(`${API}/api/chat/sessions`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data.sessions)).toBe(true);
  });

  it('POST /v1/chat/completions works via OpenAI compat', async () => {
    const res = await fetch(`${API}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        model: 'studentcontext/claude',
        messages: [{ role: 'user', content: 'How are my students doing?' }],
        stream: false,
      }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.choices).toBeDefined();
    expect(data.choices[0].message.content).toBeDefined();
    expect(data.usage).toBeDefined();
  });
});
