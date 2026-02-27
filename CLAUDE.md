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
- **Chat LLM:** Claude API (swappable via LLM adapter pattern — supports OpenAI, Gemini, Copilot)
- **Auth:** SSO (SAML/OIDC) for boards, JWT sessions
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
   - **Ingestion Service** — Syncs from Google Classroom, SIS (Trillium), and assessment systems; chunks and embeds documents
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

## Planned Project Structure

```
src/
  server.ts              # Express entry point
  config/                # Env-based config, DB pool, LLM configs
  db/
    migrations/          # SQL migration files
    queries/             # Typed query functions
  services/              # Context engine, permissions, consent, embedder, LLM adapter, audit
  ingestion/             # Google Classroom sync, SIS sync, chunker, scheduler
  routes/                # chat, auth, consent, staff, admin, webhooks
  middleware/            # Auth (JWT), RBAC guards, rate limiting
  utils/                 # Crypto, validators
client/                  # React frontend (Vite)
  src/
    pages/               # StudentChat, StaffPortal, ParentConsent, AdminDashboard
    components/          # ChatInterface, StudentSelector, ConsentForm, InsightCard
    hooks/               # useChat, useAuth
docker-compose.yml       # PostgreSQL + pgvector + app
```

## API Routes

```
POST /api/chat/message         # Context-augmented chat
GET  /api/chat/sessions        # User's chat sessions
GET  /api/auth/sso             # Board SSO redirect
GET  /api/auth/me              # Current user + permissions
GET  /api/consent/:studentId   # Consent status
POST /api/consent/grant        # Parent grants consent
POST /api/consent/revoke       # Parent revokes consent
GET  /api/staff/students       # Students in teacher's scope
POST /api/staff/report-comments # Generate report card comments
POST /api/admin/sync/trigger   # Manual data sync
GET  /api/admin/audit          # Audit log queries
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

The spec defines 7 sprints. Follow this order — each builds on the previous:
1. **Foundation** — Scaffolding, Docker/DB setup, migrations, basic auth, seed data
2. **Ingestion Pipeline** — Google Classroom OAuth, sync, chunking, embedding pipeline
3. **Context Engine** — Vector search, permissions, consent, prompt augmentation, Claude chat
4. **Student Chat UI** — React chat interface, auth flow, streaming, mobile-responsive
5. **Staff Portal** — Role detection, student selector, report card comments, class insights
6. **Consent & Admin** — Parent portal, consent flows, admin dashboard, audit viewer
7. **Pilot Prep** — SIS integration, SSO, security audit, FIPPA compliance, Canadian hosting
