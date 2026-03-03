# StudentContext AI -- Architecture Documentation

**Version:** 1.0.0
**Company:** EcoWorks Web Architecture Inc.
**Target Customer:** Ontario school boards (starting with Thames Valley DSB)
**Repository:** AI-Student-Context-Service

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Why StudentContext AI?](#why-studentcontext-ai)
3. [Architecture Diagram](#architecture-diagram)
3. [Data Flow -- Chat Request](#data-flow----chat-request)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Database Schema](#database-schema)
7. [API Routes](#api-routes)
8. [Permission Model](#permission-model)
9. [Embedding Pipeline](#embedding-pipeline)
10. [Security Model](#security-model)
11. [Environment Variables](#environment-variables)
12. [Port Assignments](#port-assignments)
13. [Running Locally](#running-locally)
14. [Test Users](#test-users)
15. [MCP Server](#mcp-server)
16. [Sprint Progression](#sprint-progression)

---

## System Overview

StudentContext AI is a middleware SaaS that transforms school-board-approved LLM chatbots
into personalized learning companions. It maintains a vectorized knowledge base of each
student's digital academic history and provides role-based contextual augmentation for
students, staff, and parents.

The system uses a Retrieval-Augmented Generation (RAG) pipeline: when a user sends a
chat message, the query is embedded into a vector, similar document chunks are retrieved
from PostgreSQL (pgvector), the user's permission scope and parental consent are enforced,
and the retrieved context is injected into a system prompt before being sent to the Claude
LLM. Every context retrieval is logged for FIPPA compliance auditing.

---

## Why StudentContext AI?

Ontario school boards are under growing pressure to integrate AI tools into classrooms while maintaining strict compliance with FIPPA, PHIPA, the Ontario Education Act, and board-level privacy policies. Most commercially available AI chatbots operate without any knowledge of the student sitting in front of them -- they provide generic responses that ignore a student's actual academic history, learning needs, and support plans.

StudentContext AI bridges this gap. It is not a standalone AI product -- it is a **middleware layer** that augments board-approved LLM tools with each student's real academic context, filtered through a permission model that enforces the same access boundaries educators already follow in their daily work.

### For Students: A Tutor That Actually Knows You

A generic AI chatbot answers "How am I doing in math?" with textbook advice. StudentContext AI answers with the student's actual grades, assignment feedback, and teacher comments from Google Classroom and the SIS. A Grade 10 student at Medway High School can ask about their MPM2D progress and receive a response grounded in their Unit 3 assessment score, their Term 1 report card narrative, and their midterm submission -- not a hallucinated guess.

Students receive age-appropriate, encouraging responses that never expose raw grades or sensitive data. The AI acts as a personalized learning companion that understands what they have studied, where they have shown strength, and where they need additional practice -- all without requiring a teacher to manually brief the system.

### For Teachers: Hours Returned to Teaching

Ontario teachers spend an estimated 10-15 hours per reporting period writing report card comments for each class. StudentContext AI generates Growing Success-aligned draft comments in seconds, grounded in the student's actual assignments, grades, and class participation data from Google Classroom. A teacher can review, adjust the tone, and finalize a comment that would have otherwise taken 15-20 minutes to write from scratch.

Beyond report cards, teachers gain instant class-level insights: which students have data coverage gaps, which sources have been synced, and how many document chunks are available per student. The Staff Portal provides a student selector scoped to the teacher's actual course roster -- no risk of accidentally viewing another teacher's students.

A supply teacher covering a class gets need-to-know context about each student's current progress, limited to standard-sensitivity data and only for the assigned class on that day, so they can teach effectively without access to sensitive records.

### For Guidance Counsellors: The Complete Student Picture

Guidance counsellors often spend significant time requesting and reviewing Ontario Student Records (OSRs), cross-referencing report cards, IEPs, EQAO scores, and attendance patterns to build a holistic picture of a student's trajectory. StudentContext AI provides this picture instantly.

A counsellor can ask, "What is this student's academic trajectory over the last four years?" and receive a response that synthesizes report cards, transcripts, attendance records, IEPs, and guidance notes -- all within a single conversation. Because counsellors are assigned the `restricted` sensitivity level, they see the full depth of a student's record, including sensitive and restricted documents that teachers cannot access.

Every context retrieval is logged in the audit trail, providing the counsellor with a defensible record of what data was accessed and when -- critical for professional accountability.

### For Parents: Transparency and Control

Parents are the gatekeepers of their child's data in StudentContext AI. The Parent Consent Portal allows parents to grant or revoke AI context consent at any time, with granular control over which data sources the system may use. A parent can allow Google Classroom grades but exclude IEP data, or revoke consent entirely with a single click.

When consent is granted, parents can use the student chat interface to ask about their child's progress and receive plain-language, jargon-free responses grounded in actual academic records. The system never exposes sensitive data to parents -- only standard-sensitivity sources are included.

This model ensures compliance with Ontario's parental consent requirements under the Education Act and FIPPA, while giving families genuine visibility into how AI is being used with their child's data.

### For School Boards: Compliance, Cost Control, and Vendor Freedom

**Privacy and compliance.** StudentContext AI was designed from the ground up for Ontario's regulatory environment. Every context retrieval generates an audit entry. Multi-tenant isolation ensures Board A cannot access Board B's data -- enforced at the database level with row-level security policies and `board_id` scoping on every table. No student data is stored on LLM provider servers; context is passed per-request and never persists outside the board's database.

**Cost control.** The LLM Gateway and API Key Broker model means EcoWorks holds the master LLM keys and proxies requests with configurable markup. Boards set monthly token budgets with 90% warning thresholds and hard 100% cutoffs. Per-request cost tracking provides complete transparency into AI spending per school, per role, per provider.

**Vendor flexibility.** Boards are not locked into a single LLM vendor. The gateway supports Claude, GPT-4o, Gemini, Llama (via Groq), and Mistral. A board can start with Claude today and switch to a locally-hosted model tomorrow without changing a single line of application code. The same flexibility applies to identity providers (Clerk, Entra ID, Google), Student Information Systems (Aspen, any OneRoster 1.1-compliant SIS), and chat frontends (native UI, OpenWebUI, MCP-enabled tools).

**OECM alignment.** With 38+ Ontario boards already using Aspen via the OECM contract, StudentContext AI's native Aspen and OneRoster integration means deployment requires only API credentials -- no custom data pipelines or ETL jobs.

### For IT Departments: Deployable, Maintainable, Extensible

**Simple deployment.** The entire stack runs as Docker containers: PostgreSQL with pgvector, the Node.js API server, and optionally the MCP HTTP server. A board IT team can have a development instance running in under an hour.

**Multi-tenant by default.** A single deployment serves all schools within a board. Adding a new school requires only a database entry, not a new server instance. Row-level security ensures data isolation without operational overhead.

**SIS integration without middleware.** StudentContext AI connects directly to Aspen via OAuth 2.0 client credentials or the OneRoster 1.1 standard. Nightly batch syncs and webhook-driven incremental syncs keep data current without manual CSV imports or FTP transfers.

**Identity provider flexibility.** Boards using Microsoft 365 can authenticate via Entra ID. Google Workspace boards can use Google Identity. Boards with existing Clerk deployments can use Clerk. The pluggable `AuthProvider` interface means adding a new identity source is a single TypeScript class -- no refactoring of the application.

**MCP embeddability.** The context engine can be embedded into any MCP-compatible tool (Claude Desktop, Claude Code, custom applications) as a stdio or HTTP/SSE server. IT teams can expose student context to staff tools without building a separate frontend.

---

## Architecture Diagram

```
+============================================================================+
|                            CLIENT LAYER (React/Vite)                       |
|                         https://dev.ecoworks.ca:3009                       |
|                         shadcn/ui + Tailwind CSS                           |
|                                                                            |
|   +----------------+   +----------------+   +---------------------------+  |
|   |  Login Page    |   |  Student Chat  |   |      Staff Portal         |  |
|   |  (all roles)   |   |  (student,     |   |  +-----+--------+------+ |  |
|   |                |   |   parent)      |   |  |Chat |Reports |Insight| |  |
|   +-------+--------+   +-------+--------+   |  |Tab  |Tab     |Tab   | |  |
|           |                     |            |  +-----+--------+------+ |  |
|   +-------+---------------------+------+------+-----+                    |
|   | Parent Consent |  | Admin Dashboard |  | Changelog Modal |           |
|   | Portal         |  | (audit, users)  |  | (docs, roadmap) |           |
|   +----------------+  +-----------------+  +-----------------+           |
|           |                                                               |
|           |   Auth Provider (dev JWT | future: Clerk, Entra, Google)     |
|           +-------------------------------+------------------------------+  |
|                                           |                                |
|   Vite Dev Server proxies /api/* and /health to backend                    |
+============================|==============================================+
                              |
              +---------------+---------------+
              v                               v
+=============================+  +=============================+
|    API GATEWAY              |  |      MCP SERVER             |
|    (Express/HTTPS)          |  |      (stdio transport)      |
|  dev.ecoworks.ca:3094       |  |                             |
|                             |  |  Tools:                     |
|  Middleware: helmet, CORS,  |  |   search_student_context    |
|  express.json, Auth Provider|  |   get_permission_scope      |
|                             |  |   check_consent             |
|  +----------+ +----------+ |  |   ingest_document           |
|  | /health  | | /api/auth| |  |                             |
|  |          | | dev-login| |  |  Resources:                  |
|  |          | | me       | |  |   student context            |
|  |          | | provider | |  |   audit logs                 |
|  +----------+ +----------+ |  |   session history            |
|  +----------+ +----------+ |  +=============================+
|  | /api/chat| | /api/    | |
|  | message  | | staff    | |
|  | stream   | | students | |
|  | sessions | | reports  | |
|  +----------+ +----------+ |
|  +----------+ +----------+ |
|  | /api/    | | /api/    | |
|  | admin    | | webhooks | |
|  | ingest   | | google   | |
|  | sync     | | sis      | |
|  | sis/sync | |          | |
|  | usage    | |          | |
|  +----------+ +----------+ |
+=============================+
              |
              v
+============================================================================+
|                          SERVICE LAYER                                     |
|                                                                            |
|   +-------------------+    +--------------------+    +------------------+  |
|   | Context Engine    |    | Permission Service |    | Consent Service  |  |
|   | (RAG pipeline)    |<-->| (RBAC scope        |<-->| (verifies parent |  |
|   |                   |    |  resolution)       |    |  consent records)|  |
|   +--------+----------+    +--------------------+    +------------------+  |
|            |                                                               |
|   +--------v----------+    +--------------------+    +------------------+  |
|   | LLM Gateway       |    | Embedder Service   |    | Audit Service    |  |
|   | (token tracking)  |    | (OpenAI embeddings)|    | (FIPPA logging) |  |
|   | +---------------+ |    +--------------------+    +------------------+  |
|   | | Claude        | |                                                    |
|   | | OpenAI GPT-4o | |    +--------------------+    +------------------+  |
|   | | Gemini        | |    | Auth Provider      |    | SIS Provider     |  |
|   | | Groq (Llama)  | |    | (dev | clerk |     |    | (Mock | Aspen)  |  |
|   | | Mistral       | |    |  entra | google)   |    | OAuth 2.0,      |  |
|   | +---------------+ |    +--------------------+    | auto-refresh     |  |
|   +-------------------+                              +------------------+  |
|                                                                            |
|   +--------------------------------------------------------------------+  |
|   | Ingestion Pipeline                                                  |  |
|   | hash-dedup --> chunk (500tok/50 overlap) --> embed --> store         |  |
|   | Google Classroom Sync | Aspen SIS Sync (full + incremental)        |  |
|   +--------------------------------------------------------------------+  |
+============================|===============================================+
                              |
                              v
+============================================================================+
|                    DATA LAYER (PostgreSQL 16 + pgvector)                   |
|                      Docker: pgvector/pgvector:pg16                        |
|                           Port 5438                                        |
|                                                                            |
|   +----------+  +----------+  +----------+  +------------------+          |
|   | boards   |  | schools  |  | users    |  | student_         |          |
|   | (sis_    |  |          |  |          |  | enrollments      |          |
|   | provider)|  |          |  |          |  |                  |          |
|   +----------+  +----------+  +----------+  +------------------+          |
|   +----------+  +----------+  +---------------------+                     |
|   | courses  |  | course_  |  | staff_assignments   |                     |
|   |          |  | members  |  |                     |                     |
|   +----------+  +----------+  +---------------------+                     |
|   +----------+  +----------+  +----------+                                |
|   | documents|->| chunks   |->| embed-   |  HNSW index                    |
|   | (SHA-256)|  | (500tok) |  | dings    |  (vector_cosine_ops)           |
|   +----------+  +----------+  +----------+                                |
|   +---------------+  +----------+  +-----------------+  +-------------+   |
|   | consent_      |  | audit_   |  | chat_sessions + |  | token_usage |   |
|   | records       |  | log      |  | chat_messages   |  | (billing)   |   |
|   +---------------+  +----------+  +-----------------+  +-------------+   |
+============================================================================+
```

---

## Data Flow -- Chat Request

The following diagram shows the complete lifecycle of a chat message from user
input through context-augmented response:

```
User types message in Chat UI
         |
         v
[1] POST /api/chat/message
    { message, session_id?, target_student_id?, course_id? }
         |
         v
[2] Auth Middleware
    - Extract JWT from Authorization: Bearer <token>
    - Verify token signature and expiry
    - Attach { userId, role, boardId } to request
         |
         v
[3] Context Engine -- handleChatMessage()
         |
         v
[4] Resolve Permission Scope
    - Look up user role
    - Determine which student IDs are accessible:
        student    --> own ID only
        teacher    --> students in their courses (current + prev year)
        guidance   --> all students in their school(s)
        principal  --> all students in their school(s)
        supply     --> students in today's assigned courses only
        parent     --> own children (via consent_records)
        board_admin --> no individual access (aggregate only)
    - Determine maximum sensitivity level:
        standard   --> student, supply_teacher, parent, board_admin
        sensitive  --> teacher, educational_assistant
        restricted --> guidance_counsellor, principal, vice_principal
    - Determine allowed document sources per role
         |
         v
[5] Verify Parental Consent
    - Query consent_records for target student
    - Must have status = 'granted' for consent_type = 'ai_context'
    - Intersect consented data_sources with role-allowed sources
    - If no consent --> context retrieval skipped (chat still works, no RAG)
         |
         v
[6] Embed Query (OpenAI)
    - Send user's message text to text-embedding-3-small
    - Receive 1536-dimension vector
         |
         v
[7] Vector Similarity Search (pgvector)
    - SELECT chunks + documents via cosine distance
    - WHERE student_id = target AND sensitivity <= max allowed
    - AND document source in consented sources
    - ORDER BY cosine distance ASC
    - LIMIT 5 (configurable)
    - Filter by threshold (< 0.8 cosine distance)
         |
         v
[8] Build Augmented System Prompt
    - Select role-specific base prompt template
    - Append retrieved context chunks with source labels
    - Include student name and guidelines for the role
         |
         v
[9] Load Conversation History
    - Fetch prior messages from chat_messages for session
    - Include system prompt + history + new user message
         |
         v
[10] Call LLM (Claude via Anthropic SDK)
     - model: claude-sonnet-4-20250514 (configurable)
     - max_tokens: 2048
     - temperature: 0.7
     - Returns: content, input_tokens, output_tokens
         |
         v
[11] Store Messages
     - Save user message to chat_messages
     - Save assistant response to chat_messages (with chunks_used, token counts)
     - Increment session message_count
         |
         v
[12] Audit Logging
     - Log context_retrieval: actor, target student, query, chunk IDs, IP
     - Log chat_message: actor, session, token counts
         |
         v
[13] Return Response to Client
     {
       content: "...",
       sessionId: "uuid",
       messageId: "uuid",
       chunksUsed: ["uuid", ...],
       model: "claude-sonnet-4-20250514",
       tokenCountInput: 1234,
       tokenCountOutput: 567,
       latencyMs: 2100
     }
```

---

## Tech Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 22+ | Server-side JavaScript runtime |
| Language | TypeScript | 5.9.x | Type-safe development for backend and frontend |
| Backend Framework | Express | 5.2.x | HTTP server, routing, middleware |
| Frontend Framework | React | 19.2.x | Component-based UI |
| Build Tool (Frontend) | Vite | 7.3.x | Fast dev server, HMR, build |
| Database | PostgreSQL | 16 | Relational data storage |
| Vector Extension | pgvector | (pg16 image) | Vector similarity search for embeddings |
| Vector Index | HNSW | m=16, ef=64 | Approximate nearest neighbor search |
| Embeddings | OpenAI text-embedding-3-small | -- | 1536-dimension text embeddings |
| Chat LLM | Claude (Anthropic SDK) | 0.78.x | Context-augmented conversational AI |
| Claude Model | claude-sonnet-4-20250514 | -- | Default model (configurable) |
| Auth | JWT (jsonwebtoken) | 9.0.x | Bearer token authentication |
| Password Hashing | bcryptjs | 3.0.x | Secure password storage |
| Validation | Zod | 4.3.x | Request body validation |
| HTTP Security | Helmet | 8.1.x | Security headers |
| Google Integration | googleapis | 171.x | Google Classroom sync (OAuth, courses, submissions) |
| Markdown Rendering | react-markdown + remark-gfm | 10.x / 4.x | Rich chat message display |
| Routing (Frontend) | react-router-dom | 7.13.x | Client-side routing (login, chat, staff) |
| Container | Docker Compose | -- | PostgreSQL with pgvector |
| Dev Runner | tsx | 4.21.x | TypeScript execution with watch mode |
| HTTPS | Node.js https module | -- | TLS via shared-certs directory |

---

## Project Structure

```
AI-Student-Context-Service/
|-- package.json                  # Backend dependencies and scripts
|-- tsconfig.json                 # TypeScript configuration (ESM, NodeNext)
|-- docker-compose.yml            # PostgreSQL + pgvector container
|-- .env                          # Environment variables (not committed)
|-- .env.example                  # Template for environment setup
|-- CHANGELOG.md                  # Version history
|-- CLAUDE.md                     # AI assistant project context
|
|-- src/                          # Backend source
|   |-- server.ts                 # Express entry point (HTTPS)
|   |-- config/
|   |   `-- index.ts              # Environment-based configuration
|   |-- types/
|   |   `-- index.ts              # TypeScript types, DB enums, table shapes
|   |-- db/
|   |   |-- index.ts              # pg Pool, query(), transaction()
|   |   |-- migrate.ts            # Migration runner
|   |   |-- seed.ts               # Dev seed data (TVDSB, users, documents)
|   |   |-- reset.ts              # Drop all tables and types
|   |   |-- migrations/
|   |   |   |-- 001_extensions_and_enums.sql
|   |   |   |-- 002_boards_and_schools.sql
|   |   |   |-- 003_users_and_assignments.sql
|   |   |   |-- 004_documents_and_vectors.sql
|   |   |   |-- 005_consent_and_audit.sql
|   |   |   `-- 006_chat_sessions.sql
|   |   `-- queries/
|   |       |-- index.ts           # Re-exports all query functions
|   |       |-- users.ts           # findUserByEmail, findUserById, createUser
|   |       |-- boards.ts          # findBoardBySlug
|   |       |-- documents.ts       # CRUD for documents
|   |       |-- chunks.ts          # createChunk, findChunksByDocument
|   |       |-- embeddings.ts      # createEmbedding, searchSimilar (pgvector)
|   |       |-- consent.ts         # findActiveConsent, getConsentedSources
|   |       |-- audit.ts           # createAuditEntry, findAuditEntries
|   |       |-- chat-sessions.ts   # Session and message CRUD
|   |       |-- staff-scope.ts     # Academic year, student/school scope queries
|   |       `-- staff-students.ts  # getStudentsWithCourses, getCourseInsights
|   |-- services/
|   |   |-- context-engine.ts      # RAG pipeline orchestrator
|   |   |-- permissions.ts         # Role-based scope resolution
|   |   |-- consent.ts             # Consent verification logic
|   |   |-- llm-adapter.ts         # Provider-agnostic LLM interface (Claude)
|   |   |-- embedder.ts            # OpenAI embedding generation
|   |   `-- audit.ts               # Audit logging helpers
|   |-- ingestion/
|   |   |-- pipeline.ts            # hash --> chunk --> embed --> store
|   |   |-- chunker.ts             # 500-token chunking with 50-token overlap
|   |   `-- google-classroom.ts    # Google Classroom OAuth and sync
|   |-- routes/
|   |   |-- index.ts               # Router re-exports
|   |   |-- health.ts              # GET /health
|   |   |-- auth.ts                # POST /api/auth/dev-login, GET /api/auth/me
|   |   |-- chat.ts                # POST /api/chat/message, GET sessions
|   |   |-- staff.ts               # Staff API (students, courses, reports, insights)
|   |   |-- admin.ts               # Admin API (ingest, sync, status)
|   |   `-- webhooks.ts            # Google Classroom webhook (stub)
|   |-- middleware/
|   |   `-- auth.ts                # JWT Bearer token verification
|   `-- utils/
|       `-- crypto.ts              # bcrypt hashing, JWT sign/verify
|
|-- client/                        # Frontend source
|   |-- package.json               # React dependencies
|   |-- vite.config.ts             # HTTPS, proxy /api to backend
|   `-- src/
|       |-- main.tsx               # React entry point
|       |-- App.tsx                # Router: /login, /chat, /staff, role redirect
|       |-- api/
|       |   `-- client.ts          # Typed fetch wrapper, auth helpers, API functions
|       |-- hooks/
|       |   |-- useAuth.tsx        # AuthProvider context, login/logout, token mgmt
|       |   |-- useChat.ts         # Message state, optimistic updates, session mgmt
|       |   |-- useStaff.ts        # Student list, insights, report comment state
|       |   `-- useSpeech.ts       # Web Speech API text-to-speech for AI responses
|       |-- pages/
|       |   |-- LoginPage.tsx      # Email/password + quick-login demo buttons
|       |   |-- ChatPage.tsx       # Student/parent chat interface
|       |   `-- StaffPortal.tsx    # Tabbed staff interface (chat, reports, insights)
|       |-- components/
|       |   |-- ProtectedRoute.tsx # JWT auth guard with loading spinner
|       |   |-- SessionSidebar.tsx # Conversation history sidebar
|       |   |-- MessageList.tsx    # Markdown-rendered messages with speech controls
|       |   |-- MessageInput.tsx   # Auto-resizing textarea with Enter-to-send
|       |   |-- StudentSelector.tsx# Searchable student list with course filter
|       |   |-- ReportCommentGenerator.tsx # Report card comment form with copy
|       |   |-- ClassInsights.tsx  # Course insight cards with source breakdown
|       |   `-- InsightCard.tsx    # Stat display card component
|       |-- utils/
|       |   `-- roles.ts          # isStaffRole(), getRoleLabel()
|       `-- styles/
|           `-- index.css          # Global styles
|
`-- docs/
    |-- README.md                  # This file
    `-- API.md                     # API endpoint reference
```

---

## Database Schema

### Entity-Relationship Overview

```
boards (multi-tenant root)
  |
  +-- schools
  |     |
  |     +-- student_enrollments <-- users (role=student)
  |     +-- staff_assignments   <-- users (role=staff)
  |     +-- courses
  |           |
  |           +-- course_memberships --> users
  |
  +-- users
  |     |
  |     +-- documents (per student)
  |     |     |
  |     |     +-- chunks (500-token segments)
  |     |           |
  |     |           +-- embeddings (1536-dim vectors, HNSW indexed)
  |     |
  |     +-- consent_records (parent grants/revokes)
  |     +-- chat_sessions
  |           |
  |           +-- chat_messages
  |
  +-- audit_log (every context retrieval and chat message)
```

### PostgreSQL Enums

```sql
user_role:         student | teacher | educational_assistant | guidance_counsellor
                   | vice_principal | principal | board_admin | parent | supply_teacher

document_source:   google_classroom_assignment | google_classroom_submission
                   | google_classroom_grade | google_classroom_comment
                   | sis_report_card | sis_transcript | sis_attendance | sis_iep
                   | assessment_eqao | assessment_board | library_record
                   | teacher_note | guidance_note

sensitivity_level: standard | sensitive | restricted

consent_status:    pending | granted | denied | revoked
```

### Table Details

#### boards
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| name | TEXT | Board name (e.g., "Thames Valley District School Board") |
| slug | TEXT (UNIQUE) | URL-safe identifier (e.g., "tvdsb") |
| province | TEXT | Province code (default: "ON") |
| config | JSONB | Board-specific configuration |
| llm_provider | TEXT | Default LLM provider (default: "claude") |
| llm_config | JSONB | LLM provider settings |
| active | BOOLEAN | Whether board is active |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

#### schools
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| board_id | UUID (FK -> boards) | Parent board |
| name | TEXT | School name |
| school_code | TEXT | School identifier (unique per board) |
| grades | INT[] | Grade levels offered |
| config | JSONB | School-specific configuration |
| active | BOOLEAN | Whether school is active |

#### users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| board_id | UUID (FK -> boards) | Tenant isolation |
| external_id | TEXT | SIS/SSO identifier (unique per board) |
| email | TEXT | Login email |
| password_hash | TEXT | bcrypt hash (dev auth) |
| name_first / name_last | TEXT | User's name |
| role | user_role | Determines permissions and UI routing |
| active | BOOLEAN | Account status |
| metadata | JSONB | Role-specific data (grade, department, etc.) |

**Indexes:** board_id+role, email

#### student_enrollments
| Column | Type | Description |
|--------|------|-------------|
| student_id | UUID (FK -> users) | The student |
| school_id | UUID (FK -> schools) | Enrolled school |
| grade | INT | Grade level |
| academic_year | TEXT | e.g., "2025-2026" |
| status | TEXT | "active", "withdrawn", etc. |
| start_date / end_date | DATE | Enrollment period |

#### staff_assignments
| Column | Type | Description |
|--------|------|-------------|
| staff_id | UUID (FK -> users) | Staff member |
| school_id | UUID (FK -> schools) | Assigned school |
| academic_year | TEXT | e.g., "2025-2026" |
| department | TEXT | Department name (nullable) |
| role_scope | TEXT | Scope within school |

#### courses
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| school_id | UUID (FK -> schools) | Parent school |
| external_id | TEXT | Google Classroom course ID |
| name | TEXT | Course name (e.g., "MPM2D - Principles of Mathematics") |
| course_code | TEXT | Ontario course code (e.g., "MPM2D") |
| grade | INT | Grade level |
| subject | TEXT | Subject area |
| academic_year | TEXT | e.g., "2025-2026" |
| semester | TEXT | S1, S2, FY |
| source | TEXT | How the course was created ("manual", "google_classroom") |
| metadata | JSONB | Additional course data |

#### course_memberships
| Column | Type | Description |
|--------|------|-------------|
| course_id | UUID (FK -> courses) | The course |
| user_id | UUID (FK -> users) | Student or teacher |
| role | TEXT | "student" or "teacher" |

**Constraint:** UNIQUE(course_id, user_id)

#### documents
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| student_id | UUID (FK -> users) | Document belongs to this student |
| board_id | UUID (FK -> boards) | Tenant isolation |
| source | document_source | Origin system (Google Classroom, SIS, etc.) |
| source_id | TEXT | External system identifier |
| title | TEXT | Document title |
| content | TEXT | Full text content |
| content_date | DATE | When the content was originally created |
| academic_year | TEXT | e.g., "2025-2026" |
| course_id | UUID (FK -> courses) | Associated course (nullable) |
| sensitivity | sensitivity_level | Access restriction level |
| metadata | JSONB | Source-specific metadata |
| hash | TEXT | SHA-256 of content (deduplication) |

**Indexes:** student_id, source, student_id+academic_year, hash

#### chunks
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| document_id | UUID (FK -> documents, CASCADE) | Parent document |
| student_id | UUID (FK -> users) | Denormalized for query performance |
| board_id | UUID (FK -> boards) | Tenant isolation |
| content | TEXT | Chunk text (~500 tokens) |
| chunk_index | INT | Position within document |
| token_count | INT | Estimated token count |
| sensitivity | sensitivity_level | Inherited from document |
| metadata | JSONB | Chunk-specific metadata |

#### embeddings
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| chunk_id | UUID (FK -> chunks, CASCADE) | Parent chunk |
| student_id | UUID (FK -> users) | Denormalized for query performance |
| board_id | UUID (FK -> boards) | Tenant isolation |
| embedding | vector(1536) | OpenAI text-embedding-3-small vector |
| model | TEXT | Embedding model name |
| sensitivity | sensitivity_level | Inherited from chunk |

**Index:** HNSW on embedding with vector_cosine_ops (m=16, ef_construction=64)

#### consent_records
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| student_id | UUID (FK -> users) | Student whose data is consented |
| parent_id | UUID (FK -> users, nullable) | Parent who granted consent |
| board_id | UUID (FK -> boards) | Tenant isolation |
| consent_type | TEXT | Type of consent (e.g., "ai_context") |
| status | consent_status | Current consent state |
| data_sources | TEXT[] | Which document sources are consented |
| granted_at / revoked_at | TIMESTAMPTZ | Consent lifecycle timestamps |
| ip_address | INET | IP address of consent action |
| user_agent | TEXT | Browser user agent |
| notes | TEXT | Additional notes |

#### audit_log
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| board_id | UUID (FK -> boards) | Tenant isolation |
| actor_id | UUID (FK -> users) | Who performed the action |
| action | TEXT | "context_retrieval" or "chat_message" |
| target_student_id | UUID (FK -> users, nullable) | Whose data was accessed |
| details | JSONB | Query text, chunk IDs, token counts |
| ip_address | INET | Client IP |
| session_id | UUID | Associated chat session |
| created_at | TIMESTAMPTZ | When the action occurred |

**Indexes:** actor_id, target_student_id, created_at

#### chat_sessions
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK -> users) | Session owner |
| board_id | UUID (FK -> boards) | Tenant isolation |
| mode | TEXT | "student_chat" or "staff_chat" |
| target_student_id | UUID (FK -> users, nullable) | Staff chatting about a student |
| target_course_id | UUID (FK -> courses, nullable) | Course context |
| llm_provider | TEXT | Which LLM was used |
| started_at | TIMESTAMPTZ | Session start |
| ended_at | TIMESTAMPTZ | Session end (nullable) |
| message_count | INT | Running message counter |
| metadata | JSONB | Additional session data |

#### chat_messages
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| session_id | UUID (FK -> chat_sessions) | Parent session |
| role | TEXT | "user" or "assistant" |
| content | TEXT | Message text |
| chunks_used | UUID[] | Which context chunks were used (assistant only) |
| token_count_input | INT | LLM input tokens (assistant only) |
| token_count_output | INT | LLM output tokens (assistant only) |
| latency_ms | INT | LLM response time (assistant only) |
| created_at | TIMESTAMPTZ | Message timestamp |

**Index:** session_id

---

## API Routes

| Method | Path | Auth | Role Restriction | Description |
|--------|------|------|------------------|-------------|
| GET | `/health` | No | None | Database connectivity check |
| POST | `/api/auth/dev-login` | No | None | Email + password login, returns JWT |
| GET | `/api/auth/me` | Yes | None | Current user profile from token |
| GET | `/api/auth/provider` | No | None | Returns the active auth provider name |
| POST | `/api/chat/message` | Yes | None | Send message, receive RAG-augmented response |
| POST | `/api/chat/message/stream` | Yes | None | Send message, receive streaming SSE response |
| GET | `/api/chat/sessions` | Yes | None | List user's chat sessions |
| GET | `/api/chat/sessions/:id` | Yes | Owner only | Get session with full message history |
| GET | `/api/staff/students` | Yes | Staff roles | List students in scope with course info |
| GET | `/api/staff/courses` | Yes | Staff roles | List staff member's courses |
| GET | `/api/staff/class/:courseId/insights` | Yes | Staff roles | Class-level data insights |
| POST | `/api/staff/report-comments` | Yes | Staff roles | Generate Ontario-aligned report card comments |
| POST | `/api/admin/ingest` | Yes | Admin roles | Manually ingest a document |
| POST | `/api/admin/sync/trigger` | Yes | Admin roles | Trigger Google Classroom sync |
| GET | `/api/admin/sync/google-auth-url` | Yes | Admin roles | Get Google OAuth consent URL |
| GET | `/api/admin/sync/status` | Yes | Admin roles | Document/chunk/embedding counts |
| POST | `/api/admin/sis/sync` | Yes | Admin roles | Trigger Aspen SIS data sync for a student |
| GET | `/api/admin/sis/status` | Yes | Admin roles | SIS sync status and last sync timestamps |
| GET | `/api/admin/usage` | Yes | Admin roles | LLM token usage and cost stats by provider/model |
| POST | `/api/webhooks/google` | No | None | Google Classroom push notifications (stub) |
| POST | `/api/webhooks/sis` | No | None | SIS data change notifications for incremental sync |

Staff roles: teacher, educational_assistant, guidance_counsellor, vice_principal, principal, supply_teacher

Admin roles: board_admin, principal, vice_principal

For detailed request/response formats, see [docs/API.md](./API.md).

---

## Permission Model

### Role-Based Access Matrix

```
                    | Own Data | Students    | Sensitivity | Sources          | Years
--------------------+----------+-------------+-------------+------------------+---------
student             | Yes      | Self only   | standard    | Academics only   | All
teacher             | --       | Own courses | sensitive   | All academic     | Curr+Prev
educational_asst    | --       | Own courses | sensitive   | All academic     | Current
guidance_counsellor | --       | All school  | restricted  | All sources      | Current
vice_principal      | --       | All school  | restricted  | All sources      | Current
principal           | --       | All school  | restricted  | All sources      | Current
supply_teacher      | --       | Today class | standard    | Basic academic   | Current
parent              | --       | Own children| standard    | Parent-visible   | All
board_admin         | --       | None (agg)  | standard    | None (aggregate) | --
```

### Sensitivity Levels

| Level | Contains | Accessible By |
|-------|----------|---------------|
| `standard` | Grades, assignments, report cards, EQAO | All roles |
| `sensitive` | IEPs, behavioral notes, teacher observations | Teacher, EA, Guidance, Principal, VP |
| `restricted` | Psych-ed assessments, CAS notes, guidance records | Guidance, Principal, VP only |

### Document Source Access by Role

| Source | Student | Teacher | Guidance | Principal | Supply | Parent |
|--------|---------|---------|----------|-----------|--------|--------|
| google_classroom_assignment | Yes | Yes | Yes | Yes | Yes | Yes |
| google_classroom_submission | Yes | Yes | Yes | Yes | Yes | -- |
| google_classroom_grade | Yes | Yes | Yes | Yes | Yes | Yes |
| google_classroom_comment | -- | Yes | Yes | Yes | -- | -- |
| sis_report_card | Yes | Yes | Yes | Yes | Yes | Yes |
| sis_transcript | Yes | Yes | Yes | Yes | -- | Yes |
| sis_attendance | -- | Yes | Yes | Yes | -- | -- |
| sis_iep | -- | -- | Yes | Yes | -- | -- |
| assessment_eqao | Yes | Yes | Yes | Yes | -- | Yes |
| assessment_board | Yes | Yes | Yes | Yes | -- | Yes |
| library_record | -- | -- | Yes | Yes | -- | -- |
| teacher_note | -- | Yes | Yes | Yes | -- | -- |
| guidance_note | -- | -- | Yes | Yes | -- | -- |

### Scope Resolution Logic

1. **Teacher:** Students found via `course_memberships` where the teacher has `role='teacher'` and courses are in current or previous academic year.
2. **Guidance/Principal/VP:** Students found via `student_enrollments` at schools where staff has `staff_assignments` in the current academic year.
3. **Parent:** Children found via `consent_records` where `parent_id` matches.
4. **Supply Teacher:** Same as teacher scope but limited to current academic year only.
5. **Educational Assistant:** Course membership scope first, falls back to school-wide scope if no course memberships exist.

---

## Embedding Pipeline

### Overview

```
Raw Document Text
       |
       v
[SHA-256 Hash] --> Duplicate? --> Return existing document ID
       |
       v (new document)
[Store Document] in documents table
       |
       v
[Chunker] Split into ~500-token segments
  - Token estimation: ~4 characters per token
  - Overlap: 50 tokens between consecutive chunks
  - Word-boundary splitting (no mid-word breaks)
  - Documents <= 500 tokens stored as single chunk
       |
       v
[Store Chunks] in chunks table with chunk_index, token_count
       |
       v
[OpenAI Embedding] text-embedding-3-small
  - 1536 dimensions per vector
  - Batch API: up to 2048 texts per request
       |
       v
[Store Embeddings] in embeddings table as vector(1536)
  - HNSW index with m=16, ef_construction=64
  - Uses vector_cosine_ops for similarity search
```

### Configuration

| Parameter | Value |
|-----------|-------|
| Chunk size | ~500 tokens (2000 characters) |
| Overlap | ~50 tokens (200 characters) |
| Embedding model | text-embedding-3-small |
| Vector dimensions | 1536 |
| Index type | HNSW |
| HNSW m | 16 |
| HNSW ef_construction | 64 |
| Distance metric | Cosine distance |
| Similarity threshold | < 0.8 cosine distance |
| Default result limit | 5 chunks |
| Deduplication | SHA-256 content hash |

### Scale Estimates

| Scenario | Students | Docs/Student | Chunks | Embeddings |
|----------|----------|-------------|--------|------------|
| Pilot (TVDSB subset) | ~2,000 | ~50 | ~250K | ~250K |
| Full board (TVDSB) | ~82,000 | ~500 | ~41M | ~41M |

### Pipeline Atomicity

The entire ingest operation (document, chunks, embeddings) runs within a
single PostgreSQL transaction. If any step fails, the entire operation
rolls back, preventing orphaned records.

---

## Security Model

### Multi-Tenancy

- Every major table includes a `board_id` column for strict data isolation
- All queries filter by `board_id` from the authenticated user's JWT payload
- Cross-board data access is architecturally impossible through the API
- Row-level security is planned as defense-in-depth (Sprint 7)

### Authentication

- **Dev mode (current):** Email + password with bcrypt hashing (10 salt rounds)
- **Production (Sprint 7):** SAML/OIDC SSO integration with school board identity providers
- **Token format:** JWT with 24-hour expiry containing userId, role, boardId
- **Token transport:** Authorization: Bearer header
- **Token storage:** Client-side localStorage (key: `sc_token`)

### Consent Enforcement

- Parental consent is verified before ANY context retrieval
- Without consent, the chat still functions but without student-specific RAG augmentation
- Consent is granular: parents can consent to specific data sources (e.g., grades but not IEPs)
- Consent intersection: the system uses the intersection of role-allowed sources and parent-consented sources
- Consent can be revoked at any time (status changes from "granted" to "revoked")

### Audit Trail

- Every context retrieval logs: actor, target student, query text (truncated to 500 chars), chunk IDs retrieved, IP address
- Every chat message logs: actor, target student, session ID, token counts
- Audit entries are immutable (append-only)
- Designed for FIPPA (Freedom of Information and Protection of Privacy Act) compliance

### HTTPS

- Both frontend (Vite) and backend (Express) run over HTTPS
- SSL certificates loaded from shared-certs directory
- All API examples use `https://dev.ecoworks.ca` domain

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | `postgresql://sc_dev:dev_password@localhost:5438/studentcontext` | PostgreSQL connection string |
| `PORT` | No | `3094` | Backend server port |
| `JWT_SECRET` | No | `dev-jwt-secret-studentcontext-2026` | JWT signing secret |
| `CORS_ORIGIN` | No | `https://dev.ecoworks.ca:3009` | Allowed CORS origin |
| `NODE_ENV` | No | `development` | Environment name |
| `CLAUDE_API_KEY` | Yes* | -- | Anthropic API key for Claude chat |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-20250514` | Claude model identifier |
| `CHAT_MAX_TOKENS` | No | `2048` | Maximum tokens in LLM response |
| `CHAT_TEMPERATURE` | No | `0.7` | LLM temperature setting |
| `OPENAI_API_KEY` | Yes* | -- | OpenAI API key for embeddings |
| `GOOGLE_CLIENT_ID` | No | -- | Google Classroom OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | -- | Google Classroom OAuth client secret |
| `GOOGLE_REDIRECT_URI` | No | `https://dev.ecoworks.ca:3094/api/auth/google/callback` | OAuth redirect URI |

*Required for full functionality. Without CLAUDE_API_KEY, chat will return a 503 error. Without OPENAI_API_KEY, document ingestion will create chunks but skip embedding generation.

---

## Port Assignments

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Frontend (Vite) | 3009 | HTTPS | React development server |
| Backend API (Express) | 3094 | HTTPS | REST API server |
| PostgreSQL (Docker) | 5438 | TCP | Database (maps to container port 5432) |

**URLs:**
- Frontend: `https://dev.ecoworks.ca:3009`
- API: `https://dev.ecoworks.ca:3094`
- Database: `localhost:5438`

**Blocked ports (infrastructure):** 3000 (Grafana), 5432 (other PostgreSQL), 5678 (n8n), 6333 (Qdrant), 8xxx range (Docker services)

---

## Running Locally

### Prerequisites

- Node.js 22+
- Docker and Docker Compose
- SSL certificates in `~/.shared-certs/` (or `../.shared-certs/` relative to project)

### Setup

```bash
# 1. Clone the repository
git clone <repo-url> AI-Student-Context-Service
cd AI-Student-Context-Service

# 2. Install backend dependencies
npm install

# 3. Install frontend dependencies
cd client && npm install && cd ..

# 4. Copy and configure environment
cp .env.example .env
# Edit .env with your API keys:
#   CLAUDE_API_KEY=sk-ant-...
#   OPENAI_API_KEY=sk-...

# 5. Start PostgreSQL with pgvector
docker compose up -d

# 6. Run database migrations (creates all tables, enums, indexes)
npm run db:migrate

# 7. Seed development data (board, schools, users, course, consent, sample docs)
npm run db:seed

# 8. Start the backend API server (HTTPS on port 3094)
npm run dev

# 9. In a separate terminal, start the frontend (HTTPS on port 3009)
cd client && npm run dev
```

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `tsx watch src/server.ts` | Start backend with hot reload |
| `npm run build` | `tsc` | Compile TypeScript to JavaScript |
| `npm start` | `node dist/server.js` | Run compiled backend |
| `npm run db:migrate` | `tsx src/db/migrate.ts` | Apply pending migrations |
| `npm run db:seed` | `tsx src/db/seed.ts` | Seed development data |
| `npm run db:reset` | `tsx src/db/reset.ts` | Drop all tables and types |

---

## Test Users

All development users share the password: `devpassword123`

| Name | Email | Role | Access Level |
|------|-------|------|-------------|
| Alex Johnson | alex.johnson@tvdsb.on.ca | student | Own data, standard sensitivity |
| Sarah Chen | sarah.chen@tvdsb.on.ca | teacher | Course students, sensitive |
| David Williams | david.williams@tvdsb.on.ca | guidance_counsellor | School-wide, restricted |
| Lisa Park | lisa.park@tvdsb.on.ca | principal | School-wide, restricted |
| James Wilson | james.wilson@tvdsb.on.ca | board_admin | Aggregate only |
| Maria Johnson | maria.johnson@tvdsb.on.ca | parent | Own children (Alex), standard |

### Seed Data Relationships

- **Board:** Thames Valley District School Board (tvdsb)
- **Schools:** Medway High School (MHS), Central Elgin Collegiate Institute (CECI)
- **Course:** MPM2D - Principles of Mathematics (Grade 10, Semester 2, 2025-2026)
- **Enrollment:** Alex Johnson enrolled at Medway, Grade 10
- **Staff:** Sarah (teacher), David (guidance), Lisa (principal) assigned to Medway
- **Course Members:** Alex (student) and Sarah (teacher) in MPM2D
- **Consent:** Maria Johnson granted ai_context consent for Alex (google_classroom_assignment, google_classroom_submission, google_classroom_grade, sis_report_card)
- **Documents:** 2 sample documents for Alex (report card + assignment) with full chunk/embedding pipeline

---

## MCP Server

StudentContext AI exposes its Context Engine via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), enabling integration with Claude Desktop and other MCP-compatible clients.

For full setup instructions, tool/resource definitions, and configuration examples, see [docs/MCP.md](./MCP.md).

### Quick Overview

| Component | Details |
|-----------|---------|
| Transport | stdio |
| Tools | `search_student_context`, `get_permission_scope`, `check_consent`, `ingest_document` |
| Resources | Student context data, audit logs, session history |
| Integration | Claude Desktop via `claude_desktop_config.json` |

---

## Sprint Progression

### Sprint 1: Foundation (v0.1.0) -- COMPLETE
- Project scaffolding: TypeScript, ESM, Express, Vite React
- Docker Compose with pgvector/pgvector:pg16
- 6 database migration files covering full schema (14 tables, 4 enums)
- HNSW vector index for 1536-dimension embeddings
- Dev auth with email/password + JWT tokens
- Health check endpoint with DB connectivity
- Seed data for TVDSB board, 2 schools, 6 users, 1 course, consent records

### Sprint 2: Ingestion Pipeline (v0.2.0) -- COMPLETE
- Document ingestion pipeline: hash-dedup, chunk, embed, store (transactional)
- Text chunker: ~500-token chunks with 50-token overlap, word-boundary splitting
- OpenAI embedding service (text-embedding-3-small, 1536 dimensions, batch support)
- Google Classroom sync: OAuth flow, active courses, coursework, submissions, grades
- Admin API routes: manual ingest, sync trigger, sync status, Google auth URL
- Google Classroom webhook endpoint (stub)
- Vector similarity search via pgvector cosine distance with sensitivity/source filtering
- Sample seed documents (report card + assignment) ingested through full pipeline

### Sprint 3: Context Engine (v0.3.0) -- COMPLETE
- Context Engine (RAG pipeline): query embedding, vector search, permission-scoped augmentation, LLM chat
- Permission Service: complete RBAC for all 9 user roles with scope, sensitivity, and source resolution
- Consent Service: verifies parental consent before context retrieval, source intersection logic
- LLM Adapter: provider-agnostic interface with Claude (Anthropic SDK) implementation
- Audit Service: logs context_retrieval and chat_message actions for FIPPA compliance
- Chat API: POST /api/chat/message, GET sessions, GET session/:id with history
- Chat session management: create, load, multi-turn conversation with message history
- 8 role-specific system prompt templates (student, teacher, guidance, principal, VP, supply, parent, board_admin)
- Staff-student scope resolution queries (teacher courses, school enrollments, parent children)

### Sprint 4: Student Chat UI (v0.4.0) -- COMPLETE
- Full React frontend with login page, chat interface, and session management
- Login page with email/password form and quick-login buttons for all 6 dev users
- Chat interface with markdown rendering (react-markdown + remark-gfm), typing indicator
- Session sidebar: conversation history list with timestamps, new chat button, user info
- Auth system: JWT token storage in localStorage, AuthProvider context, protected routes
- useChat hook: message state, optimistic user message rendering, session management, error handling
- Typed API client module with fetch wrapper and automatic 401 redirect
- Responsive design: mobile sidebar overlay, collapsible header, safe-area insets
- Empty chat state with clickable suggested prompts
- Message metadata display: number of context sources used, response latency

### Sprint 5: Staff Portal (v0.5.0) -- COMPLETE
- Staff Portal: role-based UI for teachers, guidance counsellors, principals, and other staff roles
- Student Selector: searchable, course-filtered student list in staff sidebar with grade/course metadata
- Report Card Comment Generator: Ontario Growing Success-aligned comment generation with tone control (encouraging/balanced/direct), strengths/growth areas input, learning skills, copy-to-clipboard
- Class Insights dashboard: student count, document count, data coverage percentage, missing data count, source breakdown
- Staff API routes: GET /api/staff/students, GET /api/staff/courses, GET /api/staff/class/:courseId/insights, POST /api/staff/report-comments
- Role-based routing: staff roles auto-redirect to /staff portal, students/parents to /chat
- Tab navigation: Chat, Report Comments, Class Insights
- Staff-scoped chat: messages automatically target the selected student via target_student_id
- Text-to-speech: Web Speech API integration for reading AI responses aloud with play/pause/stop controls and intelligent voice selection

### Sprint 6 & 7: Consent, Admin & Infrastructure (v0.6.0) -- COMPLETE
- Parent Consent Portal: view children, grant/revoke AI context consent with granular data source selection
- Admin Dashboard: board-wide statistics, audit log viewer with filters, user management
- Consent API routes and admin API expansion
- Row-Level Security (RLS) migration: PostgreSQL policies for multi-tenant board_id isolation on all 12 tenant-scoped tables
- Production Dockerfile (multi-stage build) and production Docker Compose with pgvector health checks
- .dockerignore for clean build contexts

### Sprint 8: Auth Abstraction + Aspen Rename (v0.8.0) -- COMPLETE
- AuthProvider interface with factory pattern (backend + client)
- DevAuthProvider wrapping existing JWT/bcrypt auth, ClientAuthProvider for frontend
- GET /api/auth/provider endpoint, AUTH_PROVIDER env var (dev | clerk | entra | google)
- Renamed all Trillium SIS references to Aspen (Follett) throughout codebase
- Multi-LLM provider support enhancement

### Sprint 9: MCP Server + Chat Streaming (v0.9.0) -- COMPLETE
- MCP server exposing Context Engine via Model Context Protocol (stdio transport)
- Tools: search_student_context, get_permission_scope, check_consent, ingest_document
- Resources: student context, audit logs, session history
- Chat streaming with Server-Sent Events: AsyncGenerator chatStream() on Claude, OpenAI, Groq providers
- POST /api/chat/message/stream SSE endpoint with progressive client rendering
- Streaming state management in useChat hook

### Sprint 10: LLM Gateway with Token Tracking (v0.10.0) -- COMPLETE
- LLMGateway class wrapping all 5 providers with automatic token tracking
- Token usage table (migration 008) with provider, model, input/output tokens, cost estimate
- Pricing tables for Claude, OpenAI, Gemini, Groq, and Mistral models
- GET /api/admin/usage endpoint for board-level billing stats
- Per-provider and per-model aggregation queries
- Context engine and staff routes migrated to LLMGateway

### Sprint 11: Aspen SIS Real Integration (v0.11.0) -- COMPLETE
- SISProvider interface with 8 methods (student, report cards, transcript, attendance, IEP, EQAO, roster, school students)
- MockSISProvider wrapping existing mock-data.ts, AspenSISProvider with OAuth 2.0 client credentials
- Provider factory reads SIS_PROVIDER env var (mock/aspen) with auto-refresh and retry logic
- syncStudent() service for full data sync into embedding pipeline
- Admin endpoints: POST /api/admin/sis/sync, GET /api/admin/sis/status
- SIS webhook handler for incremental sync
- Migration 009: sis_provider and sis_config on boards table

### Sprint 12: Chat UI Polish + Documentation (v0.12.0) -- COMPLETE
- shadcn/ui design system with Tailwind CSS integration
- UI primitive components: Button, Card, Dialog, Tabs, Avatar, Tooltip, Badge
- In-app Changelog modal with tabs: Changelog, How It Works, Roadmap
- Dark/light theme support via ThemeProvider
- Lucide React icons replacing inline SVGs
- Updated all page components with shadcn/ui styling
- Comprehensive MCP server documentation (docs/MCP.md)
