// Database enum types matching PostgreSQL enums

export type UserRole =
  | 'student'
  | 'teacher'
  | 'educational_assistant'
  | 'guidance_counsellor'
  | 'vice_principal'
  | 'principal'
  | 'board_admin'
  | 'parent'
  | 'supply_teacher';

export type DocumentSource =
  | 'google_classroom_assignment'
  | 'google_classroom_submission'
  | 'google_classroom_grade'
  | 'google_classroom_comment'
  | 'sis_report_card'
  | 'sis_transcript'
  | 'sis_attendance'
  | 'sis_iep'
  | 'assessment_eqao'
  | 'assessment_board'
  | 'library_record'
  | 'teacher_note'
  | 'guidance_note';

export type SensitivityLevel = 'standard' | 'sensitive' | 'restricted';

export type ConsentStatus = 'pending' | 'granted' | 'denied' | 'revoked';

// Table shapes

export interface Board {
  id: string;
  name: string;
  slug: string;
  province: string;
  config: Record<string, unknown>;
  llm_provider: string;
  llm_config: Record<string, unknown>;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface School {
  id: string;
  board_id: string;
  name: string;
  school_code: string;
  grades: number[];
  config: Record<string, unknown>;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  board_id: string;
  external_id: string | null;
  email: string | null;
  password_hash: string | null;
  name_first: string;
  name_last: string;
  role: UserRole;
  active: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  school_id: string;
  grade: number;
  academic_year: string;
  status: string;
  start_date: Date;
  end_date: Date | null;
  created_at: Date;
}

export interface StaffAssignment {
  id: string;
  staff_id: string;
  school_id: string;
  academic_year: string;
  department: string | null;
  role_scope: string;
  created_at: Date;
}

export interface Course {
  id: string;
  school_id: string;
  external_id: string | null;
  name: string;
  course_code: string | null;
  grade: number | null;
  subject: string | null;
  academic_year: string;
  semester: string | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface CourseMembership {
  id: string;
  course_id: string;
  user_id: string;
  role: string;
  created_at: Date;
}

export interface Document {
  id: string;
  student_id: string;
  board_id: string;
  source: DocumentSource;
  source_id: string | null;
  title: string | null;
  content: string;
  content_date: Date | null;
  academic_year: string | null;
  course_id: string | null;
  sensitivity: SensitivityLevel;
  metadata: Record<string, unknown>;
  hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface Chunk {
  id: string;
  document_id: string;
  student_id: string;
  board_id: string;
  content: string;
  chunk_index: number;
  token_count: number;
  sensitivity: SensitivityLevel;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface Embedding {
  id: string;
  chunk_id: string;
  student_id: string;
  board_id: string;
  embedding: number[];
  model: string;
  sensitivity: SensitivityLevel;
  created_at: Date;
}

export interface ConsentRecord {
  id: string;
  student_id: string;
  parent_id: string | null;
  board_id: string;
  consent_type: string;
  status: ConsentStatus;
  data_sources: string[];
  granted_at: Date | null;
  revoked_at: Date | null;
  ip_address: string | null;
  user_agent: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLogEntry {
  id: string;
  board_id: string;
  actor_id: string;
  action: string;
  target_student_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  session_id: string | null;
  created_at: Date;
}

export interface ChatSession {
  id: string;
  user_id: string;
  board_id: string;
  mode: string;
  target_student_id: string | null;
  target_course_id: string | null;
  llm_provider: string;
  started_at: Date;
  ended_at: Date | null;
  message_count: number;
  metadata: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  chunks_used: string[];
  token_count_input: number | null;
  token_count_output: number | null;
  latency_ms: number | null;
  created_at: Date;
}

// JWT payload
export interface JwtPayload {
  userId: string;
  role: UserRole;
  boardId: string;
}

// Express request augmentation
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
