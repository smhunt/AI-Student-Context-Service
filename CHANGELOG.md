# Changelog

## [0.5.0] - 2026-02-28

### Added
- Staff Portal: role-based UI for teachers, guidance counsellors, principals, and other staff
- Student Selector: searchable, course-filtered student list in staff sidebar
- Report Card Comment Generator: Ontario Growing Success-aligned comment generation with tone control, strengths/growth areas, learning skills, and copy-to-clipboard
- Class Insights dashboard: student count, document coverage, data source breakdown
- Staff API routes: GET /api/staff/students, GET /api/staff/courses, GET /api/staff/class/:courseId/insights, POST /api/staff/report-comments
- Role-based routing: staff roles auto-redirect to /staff, students/parents to /chat
- Tab navigation in Staff Portal: Chat, Report Comments, Class Insights
- Staff-scoped chat: messages target selected student via target_student_id

### Fixed
- Demo user emails in LoginPage now match seed data (David Williams, Lisa Park, Maria Johnson)

## [0.4.0] - 2026-02-28

### Added
- Student Chat UI: full React frontend with login, chat interface, and session management
- Login page with email/password form and quick-login buttons for all 6 dev users
- Chat interface with markdown rendering (react-markdown + remark-gfm), typing indicator, auto-scroll
- Session sidebar: conversation history list, new chat, user info, sign out
- Auth system: JWT token storage, AuthProvider context, protected routes
- useChat hook: message state, optimistic updates, session loading, error handling
- API client module with typed fetch wrapper and automatic 401 redirect
- Responsive design: mobile sidebar overlay, collapsible header
- Empty chat state with suggested prompts
- Message metadata display (sources used, response latency)
- react-router-dom, react-markdown, remark-gfm dependencies

## [0.3.0] - 2026-02-27

### Added
- Context Engine (RAG pipeline): embed query, vector search, permission-scoped augmentation, LLM chat
- Permission Service: role-based access control for all 9 user roles
- Consent Service: verifies parental consent before any context retrieval
- LLM Adapter: provider-agnostic interface with Claude (Anthropic) implementation
- Audit Service: logs every context retrieval and chat message for FIPPA compliance
- Chat API routes: POST /api/chat/message, GET /api/chat/sessions, GET /api/chat/sessions/:id
- Chat session management with multi-turn conversation support
- Role-specific system prompt templates (student, teacher, guidance, principal, parent, supply, admin)
- DB queries for consent verification, audit logging, chat sessions, staff-student scope resolution
- Source filtering on vector similarity search for permission enforcement
- @anthropic-ai/sdk dependency for Claude API integration

## [0.2.0] - 2026-02-27

### Added
- Ingestion pipeline: document → chunk → embed → store with SHA-256 dedup
- Text chunker: ~500-token chunks with 50-token overlap, word-boundary splitting
- OpenAI embedding service using text-embedding-3-small (1536 dimensions)
- Google Classroom sync: OAuth flow, courses, coursework, submissions, grades
- Admin API routes: manual ingest, sync trigger, sync status
- Google Classroom webhook endpoint (stub for push notifications)
- DB query functions for documents, chunks, and embeddings
- Vector similarity search via pgvector cosine distance
- Sample seed documents (report card + assignment) with full pipeline ingestion
- googleapis and openai npm dependencies

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
