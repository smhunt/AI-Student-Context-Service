# Changelog

## [0.1.0] - 2026-02-27

### Added
- Project scaffolding: TypeScript, ESM, Express backend, Vite React frontend
- Docker Compose with pgvector/pgvector:pg16 on port 5438
- Database migration system with 6 migration files covering full schema
- PostgreSQL enums: user_role, document_source, sensitivity_level, consent_status
- Tables: boards, schools, users, student_enrollments, staff_assignments, courses, course_memberships, documents, chunks, embeddings, consent_records, audit_log, chat_sessions, chat_messages
- HNSW vector index for 1536-dimension embeddings (text-embedding-3-small)
- Dev auth: email + password login with JWT tokens
- Health check endpoint with DB connectivity verification
- Seed data: TVDSB board, 2 schools, 6 users (all roles), 1 course, enrollment, consent
- Minimal React frontend with health check display on port 3009
- Architecture documentation in docs/README.md
