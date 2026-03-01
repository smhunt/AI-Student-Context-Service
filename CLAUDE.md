# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

StudentContext AI is a middleware SaaS that transforms school-board-approved LLM chatbots into personalized learning companions. It maintains a vectorized knowledge base of each student's digital academic history and provides role-based contextual augmentation for students, staff, and parents.

**Target customer:** Ontario school boards (starting with Thames Valley DSB).
**Company:** EcoWorks Web Architecture Inc.
**Full specification:** `Prompt-plan.md.txt` (database schema, service interfaces, permission model, sprint plan)

## Tech Stack

- **Backend:** TypeScript, Node.js, Express (or tRPC)
- **Frontend:** React (Vite)
- **Database:** PostgreSQL 16 + pgvector extension
- **Embeddings:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **Chat LLM:** LLM Gateway (Claude, OpenAI GPT-4o, Gemini, Llama/Groq, Mistral) with token tracking
- **Auth:** AuthProvider abstraction (dev-login, with Clerk/Entra/Google pluggable)
- **MCP:** Model Context Protocol server for Claude Desktop integration
- **SIS:** SISProvider abstraction (Mock, Aspen/Follett with OAuth 2.0)
- **Containerization:** Docker Compose (pgvector/pgvector:pg16 image)

## Port Assignments (registered in ~/.claude/PORTS.md)

| Service | Port | Type |
|---------|------|------|
| Frontend | 3009 | Vite/React |
| Backend API | 3094 | Express |
| Database | 5438 | PostgreSQL |

**URLs:**
- Frontend: `https://dev.ecoworks.ca:3009`
- API: `https://dev.ecoworks.ca:3094`

**Do NOT use** ports 3000, 5432, 5678, 6333, or anything in the 8xxx range — these are reserved infrastructure.

## Architecture

### Three-Layer Design

1. **Client Layer** — React portals: Student Chat, Staff Portal, Parent Consent, Admin Dashboard
2. **Service Layer** — Core business logic:
   - **Context Engine** (`context-engine.ts`) — RAG pipeline: embed query → vector similarity search (scoped by permissions) → augment prompt → send to LLM
   - **Permission Service** (`permissions.ts`) — Role-based access control determining which students' data and sensitivity levels each user can access
   - **Consent Service** (`consent.ts`) — Verifies parental consent before any context retrieval
   - **Ingestion Service** — Syncs from Google Classroom, SIS (Aspen/Follett), and assessment systems; chunks and embeds documents
   - **LLM Adapter** (`llm-adapter.ts`) — Provider-agnostic wrapper (boards may mandate different LLMs)
   - **Audit Service** — Logs every context retrieval for compliance
3. **Data Layer** — PostgreSQL + pgvector with multi-tenant isolation via `board_id` on all tables

### Data Flow (Chat Request)

```
User Query → Auth/RBAC middleware → Permission scope resolution → Consent check
→ Embed query → Vector search (filtered by student_id, sensitivity, source)
→ Build augmented system prompt → Send to LLM → Log audit → Return response
```

### Key Design Patterns

- **Multi-tenancy:** Every table has `board_id` for strict data isolation. Row-level security as defense-in-depth.
- **Sensitivity levels:** `standard` (academics), `sensitive` (IEPs, behavioral), `restricted` (psych-ed, CAS). Role determines max sensitivity access.
- **Dedup:** SHA-256 hash on document content prevents duplicate ingestion.
- **Sync strategy:** Initial full sync + incremental via webhooks (Google Classroom push). SIS via nightly batch. All syncs are idempotent.

### Permission Model (Critical)

Every context retrieval is scoped by role:
- **Student:** Own data only, standard sensitivity
- **Teacher:** Current students, standard + sensitive, current + previous year
- **Guidance counsellor:** Caseload students, all sensitivity levels
- **Principal/VP:** All school students, all sensitivity
- **Supply teacher:** Today's assigned class only, standard only
- **Parent:** Own children only, standard only
- **Board admin:** Aggregate queries only, no individual student context

### Database Enums

These PostgreSQL enums are defined in the schema — use them consistently:
- `user_role`: student, teacher, educational_assistant, guidance_counsellor, vice_principal, principal, board_admin, parent, supply_teacher
- `document_source`: google_classroom_assignment, google_classroom_submission, google_classroom_grade, google_classroom_comment, sis_report_card, sis_transcript, sis_attendance, sis_iep, assessment_eqao, assessment_board, library_record, teacher_note, guidance_note
- `sensitivity_level`: standard, sensitive, restricted
- `consent_status`: pending, granted, denied, revoked

## Project Structure

```
src/
  server.ts              # Express entry point
  config/                # Env-based config, DB pool, LLM configs
  auth/                  # AuthProvider interface, DevAuthProvider, factory
  mcp/                   # MCP server (tools, resources, stdio transport)
  db/
    migrations/          # SQL migration files (001-009)
    queries/             # Typed query functions (audit, consent, token-usage)
  services/              # Context engine, permissions, consent, embedder, LLM gateway, audit
  ingestion/
    sis/                 # SISProvider interface, MockSIS, AspenSIS, factory
    google-classroom.ts  # Google Classroom OAuth + sync
    sis-sync.ts          # Student data sync service
    pipeline.ts          # Ingestion pipeline (dedup, chunk, embed)
  routes/                # chat, auth, consent, staff, admin, webhooks
  middleware/            # Auth (JWT via AuthProvider), RBAC guards
  utils/                 # Crypto, validators
client/                  # React frontend (Vite + Tailwind)
  src/
    pages/               # StudentChat, StaffPortal, ParentConsent, AdminDashboard
    components/          # Chat components, StudentSelector, ChangelogModal
    components/ui/       # shadcn/ui primitives (Button, Card, Dialog, Tabs, etc.)
    auth/                # ClientAuthProvider, DevAuthClient, factory
    hooks/               # useChat, useAuth, useAdmin, useStaff, useSpeech
    lib/                 # Utilities (cn)
docs/                    # README.md, API.md, MCP.md
docker-compose.yml       # PostgreSQL + pgvector + app
```

## API Routes

```
POST /api/chat/message         # Context-augmented chat
POST /api/chat/message/stream  # Streaming SSE chat
GET  /api/chat/sessions        # User's chat sessions
GET  /api/auth/dev-login       # Dev-mode email/password login
GET  /api/auth/me              # Current user + permissions
GET  /api/auth/provider        # Active auth provider name
GET  /api/consent/:studentId   # Consent status
POST /api/consent/grant        # Parent grants consent
POST /api/consent/revoke       # Parent revokes consent
GET  /api/staff/students       # Students in teacher's scope
POST /api/staff/report-comments # Generate report card comments
POST /api/admin/sync/trigger   # Manual data sync
GET  /api/admin/audit          # Audit log queries
POST /api/admin/sis/sync       # Trigger Aspen SIS sync
GET  /api/admin/sis/status     # SIS provider status
GET  /api/admin/usage          # LLM token usage/billing stats
GET  /api/admin/llm-providers  # Configured LLM providers
POST /api/webhooks/google      # Google Classroom push notifications
POST /api/webhooks/sis         # SIS data change notifications
```

## Embedding Pipeline

- Chunk size: 500 tokens with 50-token overlap
- Model: `text-embedding-3-small` (1536 dimensions)
- Vector index: HNSW (`m=16, ef_construction=64`) with `vector_cosine_ops`
- Scale estimate: Pilot ~2K students (trivial), full board ~82K students × ~500 chunks each = ~41M embeddings

## Environment Variables

```
DATABASE_URL=postgresql://sc_dev:dev_password@localhost:5438/studentcontext
CLAUDE_API_KEY=
OPENAI_API_KEY=          # For embeddings
GOOGLE_CLIENT_ID=        # Google Classroom OAuth
GOOGLE_CLIENT_SECRET=
NODE_ENV=development
```

## Build Sprint Order

All 12 sprints complete:
1. **Foundation** — Scaffolding, Docker/DB setup, migrations, basic auth, seed data
2. **Ingestion Pipeline** — Google Classroom OAuth, sync, chunking, embedding pipeline
3. **Context Engine** — Vector search, permissions, consent, prompt augmentation, Claude chat
4. **Student Chat UI** — React chat interface, auth flow, streaming, mobile-responsive
5. **Staff Portal** — Role detection, student selector, report card comments, class insights
6. **Consent & Admin** — Parent portal, consent flows, admin dashboard, audit viewer
7. **Infrastructure** — RLS migration, Dockerfile, production compose, multi-LLM support
8. **Auth Abstraction** — AuthProvider interface, Trillium→Aspen rename
9. **MCP + Streaming** — MCP server for Claude Desktop, chat streaming with SSE
10. **LLM Gateway** — Token tracking, pricing tables, billing stats
11. **Aspen SIS** — SISProvider interface, mock + real Aspen client, sync service
12. **UI Polish** — shadcn/ui design system, Tailwind, changelog modal, documentation
