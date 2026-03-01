# MCP Server Documentation

**StudentContext AI** exposes its Context Engine as a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server. This allows Claude Desktop, Claude Code, and any MCP-compatible client to query student academic data, check permissions and consent, and ingest documents -- all through the same permission-scoped RAG pipeline that powers the web application.

**Server name:** `studentcontext-ai`
**Version:** `1.0.0`
**Transport:** stdio (Claude Desktop) or HTTP/SSE (network deployment)
**Company:** EcoWorks Web Architecture Inc.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Claude Desktop Configuration](#claude-desktop-configuration)
3. [Tools Reference](#tools-reference)
4. [Resources Reference](#resources-reference)
5. [Authentication](#authentication)
6. [Environment Variables](#environment-variables)
7. [Architecture](#architecture)
8. [Example Usage](#example-usage)

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 16 with pgvector running on port `5438`
- OpenAI API key (for embeddings)
- A populated `.env` file at the project root

### Run the MCP server

**Development (via tsx):**

```bash
cd /path/to/AI-Student-Context-Service
npx tsx src/mcp/index.ts
```

**Production (compiled):**

```bash
cd /path/to/AI-Student-Context-Service
npm run build
node dist/mcp/index.js
```

**Via npm script:**

```bash
npm run mcp
```

The server starts on **stdio** transport. It does not open a network port -- communication happens over stdin/stdout, which is the standard MCP transport for local integrations.

### HTTP/SSE Transport (Network Deployment)

For embedding the context engine into other systems, use the HTTP/SSE transport:

```bash
# Via environment variable
MCP_HTTP_ENABLED=true MCP_HTTP_PORT=3095 npm run dev

# Standalone
npx tsx src/mcp/http-server.ts

# Docker
docker compose -f docker-compose.mcp.yml up
```

The HTTP server exposes:
- `GET /sse` — Establish SSE connection (requires Bearer token)
- `POST /messages?sessionId=...` — Send JSON-RPC messages (requires Bearer token)
- `GET /health` — Health check (no auth)

Auth uses the same `AuthProvider` as the main API (dev JWT, Clerk, Entra, Google).

On successful startup, the server logs to stderr:

```
[MCP] StudentContext AI server running on stdio
```

---

## Claude Desktop Configuration

Add this block to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Development (using tsx)

```json
{
  "mcpServers": {
    "studentcontext": {
      "command": "npx",
      "args": ["tsx", "src/mcp/index.ts"],
      "cwd": "/path/to/AI-Student-Context-Service",
      "env": {
        "DATABASE_URL": "postgresql://sc_dev:dev_password@localhost:5438/studentcontext",
        "OPENAI_API_KEY": "sk-...",
        "MCP_ENABLED": "true",
        "MCP_AUTH_TOKEN": "your-secret-token"
      }
    }
  }
}
```

### Production (compiled)

```json
{
  "mcpServers": {
    "studentcontext": {
      "command": "node",
      "args": ["dist/mcp/index.js"],
      "cwd": "/path/to/AI-Student-Context-Service",
      "env": {
        "DATABASE_URL": "postgresql://sc_dev:dev_password@localhost:5438/studentcontext",
        "OPENAI_API_KEY": "sk-...",
        "MCP_ENABLED": "true",
        "MCP_AUTH_TOKEN": "your-secret-token"
      }
    }
  }
}
```

Replace `/path/to/AI-Student-Context-Service` with the actual absolute path to the project root.

---

## Tools Reference

The MCP server exposes six tools. All tool responses return JSON content as a `text` content block. Error responses include `isError: true`.

### `search_student_context`

Search a student's academic context using semantic similarity. Returns relevant document chunks scoped by the caller's role permissions and parental consent.

**This is the core RAG tool.** It embeds the query, performs a pgvector similarity search filtered by the user's permission scope, and logs the retrieval to the audit trail.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | `string` (UUID) | Yes | Authenticated user ID performing the search |
| `board_id` | `string` (UUID) | Yes | Board ID for multi-tenant scoping |
| `student_id` | `string` (UUID) | Yes | Target student ID to search context for |
| `query` | `string` | Yes | Natural language query to search against student records |
| `max_results` | `number` (1-20) | No | Maximum chunks to return. Default: `5` |

#### Response

```json
{
  "student_id": "uuid",
  "chunks": [
    {
      "chunk_id": "uuid",
      "content": "The student demonstrated strong understanding of quadratic equations...",
      "source": "google_classroom_assignment",
      "title": "Math Unit 3 - Quadratics",
      "similarity": 0.87
    }
  ],
  "total": 3
}
```

#### Error Responses

- **Permission denied** -- The target student is not in the caller's permission scope:
  ```json
  { "error": "Permission denied: student not in scope" }
  ```
- **No consent** -- The student does not have active parental consent:
  ```json
  { "error": "No active parental consent for this student" }
  ```

#### Pipeline Steps

1. Resolve the caller's permission scope (role-based)
2. Verify the target student is within that scope
3. Check parental consent for the student
4. Embed the query using OpenAI `text-embedding-3-small`
5. Perform vector similarity search (HNSW index, cosine distance) filtered by sensitivity level and allowed sources
6. Log the retrieval to the audit trail
7. Return matching chunks

---

### `get_permission_scope`

Get the permission scope for a user -- which students they can access, their maximum sensitivity level, and allowed data sources based on their role.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | `string` (UUID) | Yes | User ID to resolve permissions for |
| `board_id` | `string` (UUID) | Yes | Board ID for multi-tenant scoping |

#### Response

```json
{
  "user_id": "uuid",
  "student_count": 28,
  "student_ids": ["uuid1", "uuid2", "..."],
  "max_sensitivity": "sensitive",
  "data_sources": [
    "google_classroom_assignment",
    "google_classroom_submission",
    "google_classroom_grade",
    "sis_report_card"
  ],
  "academic_years": ["2024-2025", "2025-2026"]
}
```

#### Sensitivity Levels by Role

| Role | Max Sensitivity | Scope |
|------|----------------|-------|
| `student` | `standard` | Own data only |
| `teacher` | `sensitive` | Current students, current + previous year |
| `educational_assistant` | `sensitive` | Assigned students |
| `guidance_counsellor` | `restricted` | Caseload students |
| `vice_principal` | `restricted` | All school students |
| `principal` | `restricted` | All school students |
| `board_admin` | (aggregate only) | No individual student context |
| `parent` | `standard` | Own children only |
| `supply_teacher` | `standard` | Today's assigned class only |

---

### `check_consent`

Check if a student has active parental consent for AI context retrieval.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `student_id` | `string` (UUID) | Yes | Student ID to check consent for |
| `consent_type` | `string` | No | Type of consent to check. Default: `ai_context` |

#### Response (consent exists)

```json
{
  "student_id": "uuid",
  "has_consent": true,
  "status": "granted",
  "data_sources": ["google_classroom_assignment", "sis_report_card"],
  "granted_at": "2025-09-15T14:30:00.000Z"
}
```

#### Response (no consent)

```json
{
  "student_id": "uuid",
  "has_consent": false,
  "status": "none"
}
```

#### Consent Statuses

| Status | Description |
|--------|-------------|
| `granted` | Parent has given active consent |
| `denied` | Parent has explicitly denied consent |
| `revoked` | Consent was previously granted but has been revoked |
| `pending` | Consent request sent but no response yet |
| `none` | No consent record exists |

---

### `ingest_document`

Ingest a document into the student context system. Handles deduplication (SHA-256 content hash), chunking (~500 tokens with 50-token overlap), embedding (OpenAI `text-embedding-3-small`), and storage in PostgreSQL + pgvector.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `student_id` | `string` (UUID) | Yes | Student this document belongs to |
| `board_id` | `string` (UUID) | Yes | Board ID for multi-tenant isolation |
| `source` | `string` (enum) | Yes | Document source type (see allowed values below) |
| `title` | `string` | Yes | Document title |
| `content` | `string` | Yes | Full text content of the document (min 1 character) |
| `sensitivity` | `string` (enum) | Yes | Sensitivity level: `standard`, `sensitive`, or `restricted` |
| `academic_year` | `string` | No | Academic year, e.g. `2025-2026` |
| `course_id` | `string` (UUID) | No | Associated course ID |

#### Allowed `source` Values

- `google_classroom_assignment`
- `google_classroom_submission`
- `google_classroom_grade`
- `google_classroom_comment`
- `sis_report_card`
- `sis_transcript`
- `sis_attendance`
- `sis_iep`
- `assessment_eqao`
- `assessment_board`
- `library_record`
- `teacher_note`
- `guidance_note`

#### Response

```json
{
  "document_id": "uuid",
  "chunks_created": 4,
  "embeddings_created": 4,
  "duplicate": false
}
```

If the document content matches an existing document's SHA-256 hash, the response returns `duplicate: true` and no new chunks or embeddings are created.

---

### `context_augmented_chat`

Full RAG pipeline as a single tool call. Equivalent to `POST /api/chat/message` but accessible via MCP. Routes through the API key broker for billing.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | `string` (UUID) | Yes | Authenticated user ID |
| `board_id` | `string` (UUID) | Yes | Board ID for multi-tenant scoping |
| `query` | `string` | Yes | User message / question |
| `student_id` | `string` (UUID) | No | Target student ID (defaults to self for students) |
| `session_id` | `string` (UUID) | No | Existing chat session to continue |
| `max_chunks` | `number` (1-20) | No | Maximum context chunks. Default: `5` |

#### Response

```json
{
  "response": "Based on Alex's recent math assessments...",
  "session_id": "uuid",
  "message_id": "uuid",
  "model": "claude-sonnet-4-20250514",
  "chunks_used": 3,
  "token_count_input": 1200,
  "token_count_output": 450,
  "latency_ms": 2100
}
```

---

### `bulk_search`

Search across all students in the caller's permission scope. For staff aggregation use cases.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | `string` (UUID) | Yes | Authenticated user ID |
| `board_id` | `string` (UUID) | Yes | Board ID for multi-tenant scoping |
| `query` | `string` | Yes | Search query |
| `max_students` | `number` (1-50) | No | Max students to search. Default: `20` |
| `max_chunks_per_student` | `number` (1-10) | No | Max chunks per student. Default: `3` |

#### Response

```json
{
  "query": "struggling with fractions",
  "students_searched": 20,
  "students_with_results": 8,
  "results": [
    {
      "student_id": "uuid",
      "chunks": [
        { "content": "...", "source": "google_classroom_grade", "similarity": 0.91 }
      ]
    }
  ]
}
```

---

## Resources Reference

The MCP server exposes three read-only resources using URI templates. These provide summary views of system data without requiring tool invocation.

### `studentcontext://students/{id}/context`

**Name:** Student Context Summary

Overview of a student's ingested documents, chunks, and embedding coverage.

#### URI Example

```
studentcontext://students/550e8400-e29b-41d4-a716-446655440000/context
```

#### Response

```json
{
  "student_id": "550e8400-e29b-41d4-a716-446655440000",
  "documents": [
    { "source": "google_classroom_assignment", "sensitivity": "standard", "count": 12 },
    { "source": "sis_report_card", "sensitivity": "standard", "count": 3 },
    { "source": "sis_iep", "sensitivity": "sensitive", "count": 1 }
  ],
  "chunks": {
    "total": 84,
    "total_tokens": 38200
  },
  "embeddings": {
    "total": 84
  }
}
```

---

### `studentcontext://audit/{board_id}`

**Name:** Audit Logs

Recent audit log entries for a board. Returns the 50 most recent entries including actor name, action, target student, and timestamp.

#### URI Example

```
studentcontext://audit/660e8400-e29b-41d4-a716-446655440000
```

#### Response

```json
{
  "board_id": "660e8400-e29b-41d4-a716-446655440000",
  "entries": [
    {
      "id": "uuid",
      "actor_id": "uuid",
      "action": "context_retrieval",
      "target_student_id": "uuid",
      "details": { "query": "math performance", "chunk_count": 3 },
      "ip_address": "mcp",
      "session_id": null,
      "created_at": "2026-02-28T10:15:00.000Z",
      "actor_name": "Jane Smith"
    }
  ],
  "total": 50
}
```

---

### `studentcontext://sessions/{user_id}`

**Name:** Chat Sessions

List of a user's chat sessions with message counts, LLM provider, and timing information.

#### URI Example

```
studentcontext://sessions/770e8400-e29b-41d4-a716-446655440000
```

#### Response

```json
{
  "user_id": "770e8400-e29b-41d4-a716-446655440000",
  "sessions": [
    {
      "id": "uuid",
      "mode": "student_chat",
      "target_student_id": "uuid",
      "llm_provider": "claude",
      "message_count": 12,
      "started_at": "2026-02-28T09:00:00.000Z",
      "ended_at": "2026-02-28T09:25:00.000Z"
    }
  ],
  "total": 5
}
```

---

## Authentication

The MCP server uses a shared token (`MCP_AUTH_TOKEN`) for authentication. This token must be set in the environment when the MCP server process starts.

Because the MCP server runs as a local stdio process (not a network service), authentication is enforced at the process boundary -- only a user who can start the process with the correct environment variables can access the server.

The `user_id` and `board_id` parameters on tools serve as the identity context for permission scoping. All data access is filtered through the same RBAC permission model used by the web API:

1. The `user_id` determines which role-based permissions apply
2. The `board_id` ensures multi-tenant data isolation
3. Every context retrieval is logged to the audit trail

For production deployments with network-based MCP transports, implement proper JWT or SSO authentication at the transport layer.

---

## Environment Variables

The MCP server requires these environment variables. Set them in your `.env` file or in the Claude Desktop `env` config block.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Must point to the studentcontext database with pgvector. Example: `postgresql://sc_dev:dev_password@localhost:5438/studentcontext` |
| `OPENAI_API_KEY` | Yes | OpenAI API key for generating embeddings (`text-embedding-3-small`). Used by the `search_student_context` and `ingest_document` tools. |
| `MCP_ENABLED` | Yes | Set to `true` to enable the MCP server. |
| `MCP_AUTH_TOKEN` | Yes | Shared secret token for authenticating MCP clients. |
| `NODE_ENV` | No | Set to `development` or `production`. Affects logging verbosity. Default: `development`. |

### Example `.env`

```bash
DATABASE_URL=postgresql://sc_dev:dev_password@localhost:5438/studentcontext
OPENAI_API_KEY=sk-proj-...
MCP_ENABLED=true
MCP_AUTH_TOKEN=your-secret-token-here
NODE_ENV=development
```

---

## Architecture

### How the MCP Server Connects to the Context Engine

The MCP server is a thin protocol adapter. It does not contain business logic -- it delegates to the same service layer used by the Express API:

```
                        +-------------------+
                        |  Claude Desktop   |
                        |  or MCP Client    |
                        +--------+----------+
                                 | stdio (stdin/stdout)
                        +--------v----------+
                        |  MCP Server       |
                        |  (server.ts)      |
                        |  - Tool routing   |
                        |  - Resource routing|
                        +--------+----------+
                                 |
          +----------------------+----------------------+
          |                      |                      |
+---------v--------+  +---------v--------+  +----------v---------+
| permissions.ts   |  | consent.ts       |  | embedder.ts        |
| resolveScope()   |  | verifyConsent()  |  | generateEmbedding()|
+------------------+  +------------------+  +----------+---------+
                                                        |
                                              +---------v--------+
                                              | db/queries/      |
                                              | embeddings.ts    |
                                              | (pgvector search)|
                                              +------------------+
                                                        |
                                              +---------v--------+
                                              | PostgreSQL 16    |
                                              | + pgvector       |
                                              | Port: 5438       |
                                              +------------------+
```

### Key Design Decisions

- **Shared service layer:** The MCP server imports the same `services/` and `db/` modules as the Express API. No logic is duplicated.
- **stdio transport:** The server communicates over stdin/stdout. It does not bind a network port. Claude Desktop launches it as a child process.
- **Permission model preserved:** Every tool call goes through the full RBAC pipeline. The MCP server does not bypass any security checks.
- **Consent enforcement:** The `search_student_context` tool will refuse to return data for a student without active parental consent, matching the behavior of the web API.
- **Audit logging:** All context retrievals via MCP are logged with `ip_address: 'mcp'` to distinguish them from web API calls in the audit trail.
- **Multi-tenancy:** The `board_id` parameter on all tools ensures strict data isolation between school boards.

### File Structure

```
src/mcp/
  index.ts                          # Entry point -- loads env, creates server, connects stdio transport
  server.ts                         # Server factory -- registers all tools and resources
  http-server.ts                    # HTTP/SSE transport for network deployment
  tools/
    search-context.ts               # search_student_context tool handler
    get-permissions.ts              # get_permission_scope tool handler
    check-consent.ts                # check_consent tool handler
    ingest-document.ts              # ingest_document tool handler
    chat.ts                         # context_augmented_chat tool handler
    bulk-search.ts                  # bulk_search tool handler
  middleware/
    mcp-auth.ts                     # Bearer token auth for HTTP transport
  resources/
    student-context.ts              # studentcontext://students/{id}/context
    audit-logs.ts                   # studentcontext://audit/{board_id}
    sessions.ts                     # studentcontext://sessions/{user_id}
```

---

## Example Usage

These examples show what tool calls and responses look like from the perspective of an MCP client (e.g., Claude Desktop).

### 1. Check a Teacher's Permission Scope

**Tool call:**

```json
{
  "name": "get_permission_scope",
  "arguments": {
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "board_id": "b9c8d7e6-f5a4-3210-fedc-ba0987654321"
  }
}
```

**Response:**

```json
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "student_count": 28,
  "student_ids": [
    "s001-...", "s002-...", "s003-..."
  ],
  "max_sensitivity": "sensitive",
  "data_sources": [
    "google_classroom_assignment",
    "google_classroom_submission",
    "google_classroom_grade",
    "google_classroom_comment",
    "sis_report_card",
    "sis_transcript",
    "teacher_note"
  ],
  "academic_years": ["2024-2025", "2025-2026"]
}
```

### 2. Verify Parental Consent Before Querying

**Tool call:**

```json
{
  "name": "check_consent",
  "arguments": {
    "student_id": "s001-1234-5678-9abc-def012345678"
  }
}
```

**Response:**

```json
{
  "student_id": "s001-1234-5678-9abc-def012345678",
  "has_consent": true,
  "status": "granted",
  "data_sources": [
    "google_classroom_assignment",
    "google_classroom_submission",
    "sis_report_card"
  ],
  "granted_at": "2025-09-15T14:30:00.000Z"
}
```

### 3. Search Student Context (the core RAG query)

**Tool call:**

```json
{
  "name": "search_student_context",
  "arguments": {
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "board_id": "b9c8d7e6-f5a4-3210-fedc-ba0987654321",
    "student_id": "s001-1234-5678-9abc-def012345678",
    "query": "How has the student performed in math this semester?",
    "max_results": 5
  }
}
```

**Response:**

```json
{
  "student_id": "s001-1234-5678-9abc-def012345678",
  "chunks": [
    {
      "chunk_id": "ch-001",
      "content": "Unit 3 Assessment - Quadratic Functions: The student scored 82% and demonstrated strong procedural fluency with factoring. Areas for growth include word problem interpretation and connecting graphical representations to algebraic forms.",
      "source": "google_classroom_grade",
      "title": "MPM2D - Unit 3 Assessment",
      "similarity": 0.92
    },
    {
      "chunk_id": "ch-002",
      "content": "Term 1 Report Card - Mathematics (MPM2D): Achievement Level 3+. The student consistently completes assignments on time and participates actively in class discussions. Recommend continued focus on problem-solving strategies.",
      "source": "sis_report_card",
      "title": "2025-2026 Term 1 Report Card",
      "similarity": 0.88
    },
    {
      "chunk_id": "ch-003",
      "content": "Midterm Review Assignment: Student submitted a comprehensive review showing understanding of linear systems and analytic geometry. Noted improvement from initial diagnostic assessment.",
      "source": "google_classroom_submission",
      "title": "MPM2D Midterm Review",
      "similarity": 0.84
    }
  ],
  "total": 3
}
```

### 4. Ingest a New Document

**Tool call:**

```json
{
  "name": "ingest_document",
  "arguments": {
    "student_id": "s001-1234-5678-9abc-def012345678",
    "board_id": "b9c8d7e6-f5a4-3210-fedc-ba0987654321",
    "source": "teacher_note",
    "title": "Parent-Teacher Conference Notes - Feb 2026",
    "content": "Met with parent on Feb 15. Student is progressing well in math but struggling with time management on longer assignments. Parent confirmed student is receiving tutoring outside school. Agreed to implement a weekly planner check-in.",
    "sensitivity": "standard",
    "academic_year": "2025-2026"
  }
}
```

**Response:**

```json
{
  "document_id": "d-new-uuid",
  "chunks_created": 1,
  "embeddings_created": 1,
  "duplicate": false
}
```

### 5. Read a Resource (Student Context Summary)

**Resource URI:**

```
studentcontext://students/s001-1234-5678-9abc-def012345678/context
```

**Response:**

```json
{
  "student_id": "s001-1234-5678-9abc-def012345678",
  "documents": [
    { "source": "google_classroom_assignment", "sensitivity": "standard", "count": 15 },
    { "source": "google_classroom_grade", "sensitivity": "standard", "count": 8 },
    { "source": "sis_report_card", "sensitivity": "standard", "count": 2 },
    { "source": "teacher_note", "sensitivity": "standard", "count": 3 }
  ],
  "chunks": {
    "total": 47,
    "total_tokens": 21500
  },
  "embeddings": {
    "total": 47
  }
}
```

---

## Troubleshooting

### Server fails to start

- Verify `DATABASE_URL` points to a running PostgreSQL instance on port `5438` with pgvector installed
- Ensure the `.env` file is in the project root (the entry point calls `dotenv.config()`)
- Check that `MCP_ENABLED=true` is set

### "Permission denied: student not in scope"

The `user_id` does not have role-based access to the target `student_id`. Use `get_permission_scope` to check which students the user can access.

### "No active parental consent for this student"

The student's parent has not granted consent (status is `pending`, `denied`, `revoked`, or no record exists). Use `check_consent` to verify.

### Audit entries showing ip_address "mcp"

This is expected. All context retrievals made through the MCP server are logged with `ip_address: 'mcp'` to distinguish them from web API requests.

### Claude Desktop does not show the tools

1. Verify the `claude_desktop_config.json` path is correct for your OS
2. Ensure the `cwd` in the config points to the project root
3. Restart Claude Desktop after editing the config
4. Check the Claude Desktop MCP logs for connection errors

---

## Related Documentation

- [API Documentation](./API.md) -- REST API reference
- [Architecture Overview](./README.md) -- System architecture and tech stack
- [Project Specification](../Prompt-plan.md.txt) -- Full database schema, service interfaces, and sprint plan

**Project URLs:**
- Frontend: `https://dev.ecoworks.ca:3009`
- Backend API: `https://dev.ecoworks.ca:3094`
