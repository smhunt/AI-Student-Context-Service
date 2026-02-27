# StudentContext AI — Architecture

## Overview

StudentContext AI is a middleware SaaS that transforms school-board-approved LLM chatbots into personalized learning companions. It maintains a vectorized knowledge base of each student's digital academic history and provides role-based contextual augmentation.

**Target customer:** Ontario school boards (starting with Thames Valley DSB)
**Company:** EcoWorks Web Architecture Inc.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | TypeScript, Node.js, Express |
| Frontend | React (Vite) |
| Database | PostgreSQL 16 + pgvector |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| Chat LLM | Claude API (swappable via adapter) |
| Auth | JWT (dev), SSO/OIDC (production) |
| Container | Docker Compose |

## Architecture

```
Client Layer (React)
  ├── Student Chat
  ├── Staff Portal
  ├── Parent Consent Portal
  └── Admin Dashboard
        │
API Gateway (Express)
  ├── /api/chat     — context-augmented chat
  ├── /api/auth     — SSO/OAuth + dev login
  ├── /api/consent  — parental consent
  ├── /api/staff    — staff tools
  ├── /api/admin    — board admin
  └── /health       — health check
        │
Service Layer
  ├── Context Engine — RAG pipeline
  ├── Permission Service — RBAC
  ├── Consent Service — parental consent
  ├── Ingestion Service — data sync
  ├── LLM Adapter — provider-agnostic
  └── Audit Service — compliance logging
        │
Data Layer (PostgreSQL + pgvector)
  ├── boards, schools, users
  ├── documents, chunks, embeddings
  ├── consent_records, audit_log
  └── chat_sessions, chat_messages
```

## Running Locally

```bash
# 1. Start database
docker compose up -d

# 2. Run migrations
npm run db:migrate

# 3. Seed test data
npm run db:seed

# 4. Start API server
npm run dev

# 5. Start frontend (separate terminal)
cd client && npm run dev
```

## URLs

| Service | URL |
|---------|-----|
| Frontend | https://dev.ecoworks.ca:3009 |
| API | https://dev.ecoworks.ca:3094 |
| Database | localhost:5438 |

## Test Users (all password: `devpassword123`)

| Name | Email | Role |
|------|-------|------|
| Alex Johnson | alex.johnson@tvdsb.on.ca | student |
| Sarah Chen | sarah.chen@tvdsb.on.ca | teacher |
| David Williams | david.williams@tvdsb.on.ca | guidance_counsellor |
| Lisa Park | lisa.park@tvdsb.on.ca | principal |
| James Wilson | james.wilson@tvdsb.on.ca | board_admin |
| Maria Johnson | maria.johnson@tvdsb.on.ca | parent |

## Sprint Roadmap

1. **Foundation** (current) — Scaffolding, DB, auth, seed data
2. **Ingestion Pipeline** — Google Classroom sync, chunking, embeddings
3. **Context Engine** — Vector search, permissions, prompt augmentation
4. **Student Chat UI** — React chat interface, streaming
5. **Staff Portal** — Role detection, report card comments
6. **Consent & Admin** — Parent portal, admin dashboard, audit
7. **Pilot Prep** — SIS/SSO integration, security audit, FIPPA compliance
