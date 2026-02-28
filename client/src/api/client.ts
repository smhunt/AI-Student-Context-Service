const TOKEN_KEY = 'sc_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...opts, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

// Auth
export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  name_first: string;
  name_last: string;
  email: string;
  role: string;
  board_id: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<{ user: UserInfo }> {
  return request<{ user: UserInfo }>('/api/auth/me');
}

// Chat
export interface ChatResponse {
  content: string;
  sessionId: string;
  messageId: string;
  chunksUsed: string[];
  model: string;
  tokenCountInput: number;
  tokenCountOutput: number;
  latencyMs: number;
}

export interface ChatSession {
  id: string;
  user_id: string;
  board_id: string;
  mode: string;
  target_student_id: string | null;
  target_course_id: string | null;
  llm_provider: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
}

export interface ChatMessageRecord {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  chunks_used: string[];
  token_count_input: number | null;
  token_count_output: number | null;
  latency_ms: number | null;
  created_at: string;
}

export async function sendMessage(params: {
  message: string;
  session_id?: string;
  target_student_id?: string;
  course_id?: string;
}): Promise<ChatResponse> {
  return request<ChatResponse>('/api/chat/message', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getSessions(): Promise<{ sessions: ChatSession[] }> {
  return request<{ sessions: ChatSession[] }>('/api/chat/sessions');
}

export async function getSession(id: string): Promise<{
  session: ChatSession;
  messages: ChatMessageRecord[];
}> {
  return request<{ session: ChatSession; messages: ChatMessageRecord[] }>(
    `/api/chat/sessions/${id}`
  );
}

// Streaming chat
export async function sendMessageStream(
  params: {
    message: string;
    session_id?: string;
    target_student_id?: string;
    course_id?: string;
  },
  onText: (text: string) => void,
  onMetadata?: (data: ChatResponse & { sessionId: string; messageId: string }) => void,
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/chat/message/stream', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Stream request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'text') {
          onText(parsed.text);
        } else if (parsed.type === 'metadata') {
          onMetadata?.(parsed);
        } else if (parsed.type === 'error') {
          throw new Error(parsed.error);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

// Staff
export interface StaffStudent {
  id: string;
  name_first: string;
  name_last: string;
  email: string | null;
  grade: number | null;
  courses: { id: string; name: string; code: string | null; subject: string | null }[];
}

export interface StaffCourse {
  id: string;
  name: string;
  code: string | null;
  subject: string | null;
}

export async function getStaffStudents(): Promise<{
  students: StaffStudent[];
  courses: StaffCourse[];
}> {
  return request<{ students: StaffStudent[]; courses: StaffCourse[] }>('/api/staff/students');
}

export interface CourseInsights {
  student_count: number;
  document_count: number;
  students_with_docs: number;
  students_without_docs: number;
  source_breakdown: Record<string, number>;
}

export async function getClassInsights(courseId: string): Promise<CourseInsights> {
  return request<CourseInsights>(`/api/staff/class/${courseId}/insights`);
}

export interface ReportCommentResponse {
  comment: string;
  learning_skills: string;
  student_name: string;
  chunks_used: string[];
  model: string;
  latency_ms: number;
}

export async function generateReportComments(params: {
  student_id: string;
  course_id: string;
  term?: string;
  strengths?: string[];
  growth_areas?: string[];
  tone?: 'encouraging' | 'balanced' | 'direct';
}): Promise<ReportCommentResponse> {
  return request<ReportCommentResponse>('/api/staff/report-comments', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// === Consent ===

export interface ConsentChild {
  id: string;
  name_first: string;
  name_last: string;
  email: string | null;
  consent: {
    status: string;
    data_sources: string[];
    granted_at: string | null;
    revoked_at: string | null;
  } | null;
}

export async function getConsentChildren(): Promise<{ children: ConsentChild[] }> {
  return request<{ children: ConsentChild[] }>('/api/consent/children');
}

export async function getStudentConsent(studentId: string): Promise<{
  consent: any;
  student: { name_first: string; name_last: string };
}> {
  return request(`/api/consent/${studentId}`);
}

export async function grantConsent(
  studentId: string,
  dataSources: string[]
): Promise<{ consent: any }> {
  return request<{ consent: any }>('/api/consent/grant', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, data_sources: dataSources }),
  });
}

export async function revokeConsent(studentId: string): Promise<{ consent: any }> {
  return request<{ consent: any }>('/api/consent/revoke', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId }),
  });
}

// === Admin ===

export interface AdminStats {
  total_users: number;
  total_students: number;
  total_staff: number;
  total_documents: number;
  total_chunks: number;
  total_embeddings: number;
  total_sessions: number;
  total_messages: number;
  consent_stats: {
    granted: number;
    pending: number;
    denied: number;
    revoked: number;
  };
  recent_activity: any[];
  role_counts: Record<string, number>;
}

export interface AuditEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  target_student_id: string | null;
  target_student_name: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  name_first: string;
  name_last: string;
  email: string;
  role: string;
  board_id: string;
  is_active: boolean;
  created_at: string;
}

export async function getAdminDashboard(): Promise<{ stats: AdminStats }> {
  return request<{ stats: AdminStats }>('/api/admin/dashboard');
}

export async function getAdminAudit(params?: {
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: AuditEntry[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.action) qs.set('action', params.action);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  return request<{ entries: AuditEntry[]; total: number }>(`/api/admin/audit?${qs}`);
}

export async function getAdminUsers(params?: {
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ users: AdminUser[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.role) qs.set('role', params.role);
  if (params?.search) qs.set('search', params.search);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  return request<{ users: AdminUser[]; total: number }>(`/api/admin/users?${qs}`);
}
