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
