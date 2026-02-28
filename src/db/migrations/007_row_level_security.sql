-- Migration 007: Row-Level Security (RLS) for multi-tenant data isolation
--
-- What is RLS?
-- PostgreSQL Row-Level Security restricts which rows a database user can see
-- or modify based on policies attached to each table. When RLS is enabled on
-- a table, every query is automatically filtered through the active policies.
--
-- Why do we need it?
-- StudentContext AI is a multi-tenant system where multiple school boards share
-- the same database. Application-level filtering (WHERE board_id = ?) already
-- isolates data, but RLS acts as defense-in-depth: even if a bug in the app
-- layer omits the board filter, the database itself will prevent cross-board
-- data leakage. This is critical for FIPPA compliance and student data privacy.
--
-- How it works:
-- Before each request, the application sets a session variable:
--     SET app.current_board_id = '<board-uuid>';
-- RLS policies on every tenant-scoped table check this variable and only
-- return rows belonging to that board. When the variable is not set (NULL),
-- all rows are accessible -- this allows the dev superuser and migration
-- scripts to operate without restriction.

-- ============================================================================
-- Enable RLS on all tenant-scoped tables
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Board isolation policies
-- ============================================================================
-- Tables with a direct board_id column get a straightforward policy.
-- Tables without board_id use a subquery to resolve through a parent table.
--
-- The OR current_setting(...) IS NULL clause allows unrestricted access when
-- no board context is set (superuser/migration mode).
-- ============================================================================

-- users: direct board_id
CREATE POLICY board_isolation_users ON users
  USING (
    board_id = current_setting('app.current_board_id', true)::uuid
    OR current_setting('app.current_board_id', true) IS NULL
  );

-- documents: direct board_id
CREATE POLICY board_isolation_documents ON documents
  USING (
    board_id = current_setting('app.current_board_id', true)::uuid
    OR current_setting('app.current_board_id', true) IS NULL
  );

-- chunks: direct board_id
CREATE POLICY board_isolation_chunks ON chunks
  USING (
    board_id = current_setting('app.current_board_id', true)::uuid
    OR current_setting('app.current_board_id', true) IS NULL
  );

-- embeddings: direct board_id
CREATE POLICY board_isolation_embeddings ON embeddings
  USING (
    board_id = current_setting('app.current_board_id', true)::uuid
    OR current_setting('app.current_board_id', true) IS NULL
  );

-- consent_records: direct board_id
CREATE POLICY board_isolation_consent ON consent_records
  USING (
    board_id = current_setting('app.current_board_id', true)::uuid
    OR current_setting('app.current_board_id', true) IS NULL
  );

-- audit_log: direct board_id
CREATE POLICY board_isolation_audit ON audit_log
  USING (
    board_id = current_setting('app.current_board_id', true)::uuid
    OR current_setting('app.current_board_id', true) IS NULL
  );

-- chat_sessions: direct board_id
CREATE POLICY board_isolation_sessions ON chat_sessions
  USING (
    board_id = current_setting('app.current_board_id', true)::uuid
    OR current_setting('app.current_board_id', true) IS NULL
  );

-- chat_messages: no board_id column -- resolve through chat_sessions
CREATE POLICY session_isolation_messages ON chat_messages
  USING (
    session_id IN (
      SELECT id FROM chat_sessions
      WHERE board_id = current_setting('app.current_board_id', true)::uuid
    )
    OR current_setting('app.current_board_id', true) IS NULL
  );

-- courses: scoped via school_id -> schools.board_id
CREATE POLICY board_isolation_courses ON courses
  USING (
    school_id IN (
      SELECT id FROM schools
      WHERE board_id = current_setting('app.current_board_id', true)::uuid
    )
    OR current_setting('app.current_board_id', true) IS NULL
  );

-- course_memberships: scoped via course_id -> courses -> schools.board_id
CREATE POLICY board_isolation_memberships ON course_memberships
  USING (
    course_id IN (
      SELECT c.id FROM courses c
      JOIN schools s ON c.school_id = s.id
      WHERE s.board_id = current_setting('app.current_board_id', true)::uuid
    )
    OR current_setting('app.current_board_id', true) IS NULL
  );

-- student_enrollments: scoped via school_id -> schools.board_id
CREATE POLICY board_isolation_enrollments ON student_enrollments
  USING (
    school_id IN (
      SELECT id FROM schools
      WHERE board_id = current_setting('app.current_board_id', true)::uuid
    )
    OR current_setting('app.current_board_id', true) IS NULL
  );

-- staff_assignments: scoped via school_id -> schools.board_id
CREATE POLICY board_isolation_staff ON staff_assignments
  USING (
    school_id IN (
      SELECT id FROM schools
      WHERE board_id = current_setting('app.current_board_id', true)::uuid
    )
    OR current_setting('app.current_board_id', true) IS NULL
  );
