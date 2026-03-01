# Changelog

All notable changes to StudentContext AI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For full architecture documentation, see [docs/README.md](docs/README.md).
For API endpoint reference, see [docs/API.md](docs/API.md).

---

## [0.12.0] - 2026-02-28

Sprint 12: Chat UI polish + Documentation -- shadcn/ui design system, theme support, and in-app documentation.

### Added
- **shadcn/ui design system** with Tailwind CSS integration
- **UI primitive components**: Button, Card, Dialog, Tabs, Avatar, Tooltip, Badge
- **In-app Changelog modal** with tabs: Changelog, How It Works, Roadmap
- **Dark/light theme support** via ThemeProvider
- **Lucide React icons** replacing inline SVGs throughout the app
- **Comprehensive MCP server documentation** (`docs/MCP.md`)

### Changed
- Updated all page components with shadcn/ui styling and consistent design tokens

---

## [0.11.0] - 2026-02-28

Sprint 11: Aspen SIS real integration -- provider abstraction for Student Information Systems with live Aspen (Follett) support.

### Added
- **SISProvider interface** with 8 methods: getStudent, getReportCards, getTranscript, getAttendance, getIEP, getEQAO, getCourseRoster, getSchoolStudents
- **MockSISProvider** wrapping existing `mock-data.ts` for development
- **AspenSISProvider** with OAuth 2.0 client credentials, automatic token refresh, and retry logic
- **Provider factory** reading `SIS_PROVIDER` env var (`mock` or `aspen`)
- **syncStudent() service** for full data sync: pulls all SIS data, formats into prose, and feeds into the embedding pipeline
- **Admin SIS endpoints**: `POST /api/admin/sis/sync` (trigger sync), `GET /api/admin/sis/status` (sync status)
- **SIS webhook handler** for incremental sync on data changes
- **Migration 009**: adds `sis_provider` and `sis_config` columns to boards table

---

## [0.10.0] - 2026-02-28

Sprint 10: LLM Gateway with token tracking -- centralized LLM access with per-request cost accounting.

### Added
- **LLMGateway class** wrapping all 5 providers (Claude, OpenAI, Gemini, Groq, Mistral) with automatic token tracking
- **Token usage table** (migration 008) storing provider, model, input/output tokens, and cost estimate per request
- **Pricing tables** for Claude, OpenAI, Gemini, Groq, and Mistral models
- **`GET /api/admin/usage` endpoint** for board-level billing stats with date range filtering
- **Per-provider and per-model aggregation queries** for usage analytics

### Changed
- Context engine and staff routes now use LLMGateway for all LLM calls instead of direct adapter access

---

## [0.9.0] - 2026-02-28

Sprint 9: MCP Server + Chat Streaming -- Model Context Protocol integration and Server-Sent Events for real-time responses.

### Added
- **MCP server** exposing Context Engine via Model Context Protocol
  - Tools: `search_student_context`, `get_permission_scope`, `check_consent`, `ingest_document`
  - Resources: student context, audit logs, session history
  - Stdio transport for Claude Desktop integration
- **Chat streaming** with Server-Sent Events (SSE)
  - `AsyncGenerator chatStream()` on all LLM providers (Claude, OpenAI, Groq)
  - `POST /api/chat/message/stream` SSE endpoint
  - Progressive content rendering in client
  - Streaming state management in `useChat` hook

---

## [0.8.0] - 2026-02-28

Sprint 8: Auth abstraction + Aspen rename -- pluggable authentication and SIS naming alignment.

### Added
- **AuthProvider interface** with factory pattern (backend + client)
  - `DevAuthProvider` wrapping existing JWT/bcrypt auth
  - `ClientAuthProvider` for frontend auth abstraction
  - `GET /api/auth/provider` endpoint returning the active auth provider name
  - `AUTH_PROVIDER` env var (currently: `dev`, future: `clerk`, `entra`, `google`)
- **Multi-LLM provider support** enhancement

### Changed
- Renamed all Trillium SIS references to **Aspen (Follett)** throughout the codebase

---

## [0.6.0] - 2026-02-28

Sprint 6 & 7: Consent & Admin Portal + Infrastructure Prep -- parent consent flows, admin dashboard, RLS, and production deployment config.

### Added
- **Parent Consent Portal**: parents can view children, grant/revoke AI context consent with granular data source selection
- **Admin Dashboard**: board-wide statistics, audit log viewer with filters, user management
- **Consent API routes**: `GET /api/consent/children`, `GET /api/consent/:studentId`, `POST /api/consent/grant`, `POST /api/consent/revoke`
- **Admin API expansion**: `GET /api/admin/audit`, `GET /api/admin/dashboard`, `GET /api/admin/users`
- **Row-Level Security (RLS) migration** (`007_row_level_security.sql`): PostgreSQL policies for multi-tenant board_id isolation as defense-in-depth; all 12 tenant-scoped tables protected
- **Production Dockerfile**: multi-stage build (backend TypeScript compile, frontend Vite build, production runtime)
- **Production Docker Compose** (`docker-compose.prod.yml`): pgvector database with health checks + app service with environment variable injection
- **`.dockerignore`**: excludes node_modules, .env files, docs, and .git from Docker build context

### Changed
- Role-based routing updated: parents redirect to `/consent`, board admins to `/admin`

---

## [0.5.0] - 2026-02-28

Sprint 5: Staff Portal -- role-based tools for teachers, guidance counsellors, and school administrators.

### Added
- **Staff Portal page** (`/staff`): tabbed interface with Chat, Report Comments, and Class Insights tabs for staff roles
- **Student Selector component**: searchable sidebar listing students in the staff member's permission scope, filterable by course, displaying grade and course metadata per student
- **Report Card Comment Generator**: Ontario Growing Success framework-aligned report card comment generation
  - Tone selector (encouraging, balanced, direct)
  - Optional strengths and growth areas input (comma-separated)
  - Generated comment with character count and copy-to-clipboard button
  - Learning Skills assessment (Responsibility, Organization, Independent Work, Collaboration, Initiative, Self-Regulation)
  - Context-augmented: retrieves relevant student academic records via RAG pipeline
  - Full audit logging of context retrieval for FIPPA compliance
- **Class Insights dashboard**: course-level analytics showing student count, document count, data coverage percentage, students missing data, and document source breakdown with human-readable labels
- **Staff API routes**:
  - `GET /api/staff/students` -- list students in scope with course associations
  - `GET /api/staff/courses` -- list staff member's courses with student counts
  - `GET /api/staff/class/:courseId/insights` -- course-level data insights
  - `POST /api/staff/report-comments` -- generate Ontario-aligned report card comments
- **Role-based routing**: automatic redirect on login -- staff roles go to `/staff`, students and parents go to `/chat`
- **Staff-scoped chat**: chat messages in Staff Portal automatically include `target_student_id` for the selected student
- **Text-to-speech** (`useSpeech` hook): Web Speech API integration for reading AI responses aloud
  - Play, pause, and stop controls on each assistant message
  - Intelligent voice selection (prefers enhanced/premium voices, ranks by quality)
  - Markdown stripping for clean speech output
  - Long-text chunking (200-word segments) to prevent speech cutoff
- **Utility module** (`roles.ts`): `isStaffRole()` and `getRoleLabel()` helper functions
- **`useStaff` hook**: manages student list, course list, selected student/course, class insights, and report comment generation state

### Fixed
- Demo user emails in LoginPage now match seed data (David Williams for guidance, Lisa Park for principal, Maria Johnson for parent)
- Mobile view improvements: `100dvh` viewport height, safe area insets for notched devices, overflow prevention

### Changed
- `App.tsx` now imports `isStaffRole` and implements `RoleRouter` for automatic role-based navigation
- Login page quick-login buttons updated to 6 demo users matching the seed data

---

## [0.4.0] - 2026-02-28

Sprint 4: Student Chat UI -- full React frontend with login, real-time chat, and session management.

### Added
- **Login page** (`/login`): email and password form with form validation and error display
  - Quick-login buttons for all 6 development users (Alex/Student, Sarah/Teacher, David/Guidance, Lisa/Principal, Maria/Parent, James/Board Admin)
  - TVDSB branding with version tag
- **Chat page** (`/chat`): full-featured chat interface for students and parents
  - Markdown rendering of AI responses using `react-markdown` with `remark-gfm` (tables, strikethrough, task lists)
  - Animated typing indicator (three-dot bounce) while awaiting response
  - Auto-scroll to new messages with smooth scrolling behavior
  - Message metadata: number of context sources used and response latency in seconds
  - Empty state with suggested prompts ("How am I doing in math?", "Help me study for my science test", "What should I focus on next?")
- **Session sidebar**: collapsible conversation history panel
  - Lists all user sessions with mode label, message count, and relative timestamps
  - New Chat button to start a fresh conversation
  - User info display with name and role label
  - Sign Out button
- **Auth system**:
  - `AuthProvider` React context wrapping the entire app
  - JWT token persisted in localStorage (key: `sc_token`)
  - Automatic token validation on page load via `GET /api/auth/me`
  - Automatic redirect to `/login` on 401 responses
  - `ProtectedRoute` component with loading spinner
- **`useChat` hook**: chat state management
  - Optimistic user message rendering (appears immediately before API response)
  - Automatic session creation on first message
  - Session loading and switching
  - Error state management with automatic rollback of optimistic messages on failure
- **API client module** (`client.ts`):
  - Typed fetch wrapper with automatic Content-Type and Authorization headers
  - 401 detection with token clearing and redirect
  - Typed interfaces for all API responses (`ChatResponse`, `ChatSession`, `ChatMessageRecord`)
  - Functions: `login`, `getMe`, `sendMessage`, `getSessions`, `getSession`
- **Responsive design**:
  - Mobile: sidebar overlays chat area
  - Desktop: sidebar slides in beside chat
  - Hamburger menu button to toggle sidebar
  - Collapsible header with user name and role
- **Frontend dependencies**: `react-router-dom` v7, `react-markdown` v10, `remark-gfm` v4

### Changed
- Vite config updated with HTTPS support (shared-certs) and proxy rules for `/api/*` and `/health` to backend on port 3094

---

## [0.3.0] - 2026-02-27

Sprint 3: Context Engine -- the complete RAG pipeline connecting user queries to student data through the Claude LLM.

### Added
- **Context Engine** (`context-engine.ts`): end-to-end RAG pipeline orchestrator
  - Receives chat request with user query and optional target student
  - Resolves permission scope (which students, sensitivity level, sources)
  - Verifies parental consent before context retrieval
  - Embeds query via OpenAI, performs vector similarity search
  - Builds role-specific augmented system prompt with retrieved context
  - Loads conversation history for multi-turn support
  - Calls Claude LLM with full message history
  - Stores both user and assistant messages
  - Logs to audit trail (context retrieval + chat message events)
  - Returns response with metadata (session ID, chunks used, token counts, latency)
- **Permission Service** (`permissions.ts`): comprehensive RBAC scope resolution for all 9 user roles
  - Each role maps to: accessible student IDs, maximum sensitivity level, allowed document sources, academic year scope
  - Teacher: students in their courses (current + previous year), sensitive, all academic sources
  - Educational Assistant: course-based or school-wide fallback, sensitive
  - Guidance Counsellor: all school students, restricted, all sources including IEPs and guidance notes
  - Principal/VP: all school students, restricted, all sources
  - Supply Teacher: current courses only, standard, basic academic sources
  - Parent: own children (via consent_records), standard, parent-visible sources
  - Student: self only, standard, academic sources
  - Board Admin: no individual student access (aggregate only)
- **Consent Service** (`consent.ts`): parental consent verification
  - Checks for active `ai_context` consent record with status `granted`
  - Source intersection: only allows data sources that are both role-permitted AND parent-consented
  - Blanket consent support: empty `data_sources` array treated as consent for all sources
  - Returns `allowed` boolean and `filteredSources` list
- **LLM Adapter** (`llm-adapter.ts`): provider-agnostic LLM interface
  - `LLMProvider` interface with `chat(messages)` method
  - `ClaudeProvider` implementation using `@anthropic-ai/sdk`
  - System prompt extracted as separate Anthropic API parameter
  - Returns content, model name, token counts (input/output), latency
  - Singleton caching of provider instance
  - Designed for future OpenAI/Gemini/Copilot adapters
- **Audit Service** (`audit.ts`): FIPPA compliance logging
  - `logContextRetrieval`: records actor, target student, query (truncated to 500 chars), chunk IDs, IP address
  - `logChatMessage`: records actor, session, role, token counts
  - All entries are append-only with timestamps
- **Chat API routes** (`chat.ts`):
  - `POST /api/chat/message` with Zod validation (message, session_id, target_student_id, course_id)
  - `GET /api/chat/sessions` -- user's session list (up to 20)
  - `GET /api/chat/sessions/:id` -- session detail with full message history (owner-verified)
  - `PermissionError` handling returns 403
  - LLM unavailable returns 503
- **Chat session management** (`chat-sessions.ts`):
  - `createChatSession`: creates session with mode, target student, LLM provider
  - `addChatMessage`: stores message with chunks_used, token counts, latency; increments session message_count
  - `getSessionMessages`: retrieves ordered messages for a session
- **Role-specific system prompts**: 8 tailored prompt templates
  - Student: encouraging learning companion, no raw grades, age-appropriate
  - Teacher: clinical educator-to-educator, evidence-based observations, IEP-aware
  - Guidance: holistic student support, concerning patterns, interventions
  - Principal/VP: school-wide perspective, trends, resource allocation
  - Supply Teacher: need-to-know basics, practical, no sensitive info
  - Parent: clear non-jargon language, home support suggestions
  - Board Admin: aggregate only, policy and planning
  - Default fallback for any other role
- **DB queries**: `findActiveConsent`, `getConsentedSources`, `createAuditEntry`, `findAuditEntries`, `createChatSession`, `findChatSession`, `findUserSessions`, `addChatMessage`, `getSessionMessages`, `currentAcademicYear`, `previousAcademicYear`, `getStudentIdsForTeacher`, `getSchoolStudentIds`, `getChildrenIds`, `getStaffSchoolIds`
- **Dependencies**: `@anthropic-ai/sdk` v0.78.x

---

## [0.2.0] - 2026-02-27

Sprint 2: Ingestion Pipeline -- document processing, chunking, embedding, and Google Classroom integration.

### Added
- **Ingestion pipeline** (`pipeline.ts`): atomic document processing
  - SHA-256 content hashing for deduplication (skips if hash exists)
  - Document storage with source, sensitivity, metadata, academic year
  - Text chunking into ~500-token segments with 50-token overlap
  - OpenAI embedding generation for each chunk
  - Full pipeline runs within a single PostgreSQL transaction
  - Returns: documentId, chunksCreated, embeddingsCreated, duplicate flag
- **Text chunker** (`chunker.ts`):
  - Configurable chunk size (default: 500 tokens) and overlap (default: 50 tokens)
  - Token estimation at ~4 characters per token
  - Word-boundary splitting (looks backwards for space/newline to avoid mid-word breaks)
  - Documents smaller than chunk size returned as single chunk
  - Returns array of `{ text, tokenCount }` results
- **Embedder service** (`embedder.ts`):
  - `generateEmbedding(text)`: single text to 1536-dimension vector
  - `generateEmbeddings(texts)`: batch embedding with automatic chunking at 2048 inputs per API call
  - Index-sorted results to guarantee order
  - Lazy singleton OpenAI client initialization
- **Google Classroom sync** (`google-classroom.ts`):
  - OAuth 2.0 flow with Google APIs (consent URL generation, token exchange)
  - Required scopes: courses.readonly, coursework.students.readonly, rosters.readonly, student-submissions.students.readonly
  - Full sync: list active courses, iterate coursework, fetch student submissions
  - Ingests 3 document types per submission: assignment description, submission details, grade
  - Maps Google Classroom students to local DB users by email
  - Returns sync results: coursesProcessed, documentsIngested, errors
- **Admin API routes** (`admin.ts`):
  - `POST /api/admin/ingest`: manual document ingestion with Zod-validated body (student_email, source enum, content, sensitivity, metadata)
  - `POST /api/admin/sync/trigger`: trigger Google Classroom sync with access token
  - `GET /api/admin/sync/google-auth-url`: generate OAuth consent URL
  - `GET /api/admin/sync/status`: document/chunk/embedding counts per board
  - All routes restricted to board_admin, principal, vice_principal roles
- **Google Classroom webhook** (`webhooks.ts`):
  - `POST /api/webhooks/google`: stub endpoint for push notifications
  - Handles sync verification requests (X-Goog-Resource-State: sync)
  - Logs incoming notifications for future incremental sync implementation
- **Vector similarity search** (`embeddings.ts`):
  - `searchSimilar(queryVector, studentId, opts)`: cosine distance search via pgvector
  - Filters by student_id, sensitivity level, document source
  - Returns chunks with document title, source, distance score
  - Configurable limit, threshold, and source filtering
- **Seed data updates**: sample report card and assignment documents for Alex Johnson, processed through full pipeline (chunks + embeddings if OPENAI_API_KEY is set)
- **Dependencies**: `googleapis` v171.x, `openai` v6.x

---

## [0.1.0] - 2026-02-27

Sprint 1: Foundation -- project scaffolding, database setup, authentication, and seed data.

### Added
- **Project scaffolding**:
  - TypeScript with ES modules (ESM), NodeNext module resolution
  - Express 5.x backend with Helmet security headers and CORS
  - Vite + React frontend (port 3009)
  - Backend on port 3094 with HTTPS via shared certificates
  - Docker Compose for PostgreSQL with pgvector extension
- **Docker Compose** (`docker-compose.yml`):
  - Image: `pgvector/pgvector:pg16` (PostgreSQL 16 with vector extension)
  - Container name: `studentcontext-postgres`
  - Port mapping: 5438 (host) -> 5432 (container)
  - Named volume `pgdata` for persistence
  - Health check: `pg_isready` every 5 seconds
  - EcoWorks project labels
- **Database migration system** (`migrate.ts`):
  - `_migrations` tracking table with applied-at timestamps
  - Sequential SQL file execution with transaction wrapping
  - Rollback on failure, skip already-applied migrations
- **6 migration files**:
  - `001_extensions_and_enums.sql`: pgvector extension, uuid-ossp extension, 4 custom enum types (user_role with 9 values, document_source with 13 values, sensitivity_level with 3 values, consent_status with 4 values)
  - `002_boards_and_schools.sql`: boards table (multi-tenant root with LLM config), schools table (board_id FK, unique school_code per board)
  - `003_users_and_assignments.sql`: users table (9 roles, board-scoped external_id), student_enrollments (school+grade+year), staff_assignments (school+department+year), courses (school+code+year+semester), course_memberships (user+course, unique constraint), indexes on user email, board+role, enrollment school+year, course membership user/course
  - `004_documents_and_vectors.sql`: documents table (student_id, source enum, sensitivity, SHA-256 hash), chunks table (document cascade, student+board denormalized, token count), embeddings table (vector(1536), HNSW index with m=16 ef_construction=64 vector_cosine_ops), indexes on student, source, hash, document
  - `005_consent_and_audit.sql`: consent_records table (student, parent, board, type, status enum, data_sources array, IP/UA tracking), audit_log table (board, actor, action, target student, JSONB details, IP, session reference), indexes on consent status, audit actor/target/time
  - `006_chat_sessions.sql`: chat_sessions table (user, board, mode, target student/course, LLM provider, message count), chat_messages table (session FK, role, content, chunks_used UUID array, token counts, latency), index on messages by session
- **Authentication**:
  - `POST /api/auth/dev-login`: email + password authentication with Zod validation
  - JWT token generation with 24-hour expiry (userId, role, boardId payload)
  - `GET /api/auth/me`: retrieve current user profile from token
  - Auth middleware: Bearer token extraction, verification, request augmentation
  - Password hashing with bcryptjs (10 salt rounds)
- **Health check**: `GET /health` with PostgreSQL connectivity verification
- **Database reset**: `npm run db:reset` drops all tables and custom types
- **Seed data** (`seed.ts`):
  - Board: Thames Valley District School Board (slug: tvdsb, province: ON)
  - Schools: Medway High School (MHS, grades 9-12), Central Elgin Collegiate Institute (CECI, grades 9-12)
  - 6 users across all primary roles (student, teacher, guidance_counsellor, principal, board_admin, parent), all with password `devpassword123`
  - Student enrollment: Alex Johnson at Medway, Grade 10, 2025-2026
  - Staff assignments: Sarah (Math), David (Guidance), Lisa (Admin) at Medway
  - Course: MPM2D - Principles of Mathematics (Grade 10, S2, 2025-2026)
  - Course memberships: Alex as student, Sarah as teacher
  - Consent: Maria Johnson grants ai_context consent for Alex (4 data sources)
- **Configuration** (`config/index.ts`): environment-based config with defaults for all settings
- **Type definitions** (`types/index.ts`): TypeScript interfaces for all 14 database tables, JWT payload, Express request augmentation
- **Query modules**: `findUserByEmail`, `findUserById`, `createUser`, `findBoardBySlug`
- **Minimal React frontend**: Vite with React, health check display
