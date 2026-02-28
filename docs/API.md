# StudentContext AI -- API Reference

**Base URL:** `https://dev.ecoworks.ca:3094`
**Authentication:** JWT Bearer token in `Authorization` header
**Content-Type:** `application/json`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Health Check](#health-check)
3. [Chat](#chat)
4. [Staff](#staff)
5. [Admin](#admin)
6. [Webhooks](#webhooks)
7. [Error Responses](#error-responses)

---

## Authentication

All authenticated endpoints require the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

The JWT payload contains:

```json
{
  "userId": "uuid",
  "role": "teacher",
  "boardId": "uuid",
  "iat": 1709078400,
  "exp": 1709164800
}
```

Tokens expire after 24 hours.

---

### POST /api/auth/dev-login

Authenticate with email and password. Returns a JWT token and user profile.

**Auth Required:** No

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string (email) | Yes | User's email address |
| password | string | Yes | User's password (min 1 char) |

**Example Request:**

```bash
curl -X POST https://dev.ecoworks.ca:3094/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.chen@tvdsb.on.ca",
    "password": "devpassword123"
  }'
```

**Success Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4-...",
    "name_first": "Sarah",
    "name_last": "Chen",
    "email": "sarah.chen@tvdsb.on.ca",
    "role": "teacher",
    "board_id": "b1c2d3e4-..."
  }
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "error": "Invalid request", "details": [...] }` | Missing/invalid email or password |
| 401 | `{ "error": "Invalid email or password" }` | Wrong credentials or user not found |

---

### GET /api/auth/me

Get the currently authenticated user's profile.

**Auth Required:** Yes

**Example Request:**

```bash
curl https://dev.ecoworks.ca:3094/api/auth/me \
  -H "Authorization: Bearer <token>"
```

**Success Response (200):**

```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "name_first": "Sarah",
    "name_last": "Chen",
    "email": "sarah.chen@tvdsb.on.ca",
    "role": "teacher",
    "board_id": "b1c2d3e4-..."
  }
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 401 | `{ "error": "Missing or invalid authorization header" }` | No Bearer token |
| 401 | `{ "error": "Invalid or expired token" }` | Token verification failed |
| 404 | `{ "error": "User not found" }` | User deleted after token issued |

---

## Health Check

### GET /health

Check API server health and database connectivity.

**Auth Required:** No

**Example Request:**

```bash
curl https://dev.ecoworks.ca:3094/health
```

**Success Response (200):**

```json
{
  "status": "healthy",
  "database": "connected"
}
```

**Error Response (503):**

```json
{
  "status": "unhealthy",
  "database": "disconnected"
}
```

---

## Chat

### POST /api/chat/message

Send a message and receive a context-augmented AI response. The system will:
1. Resolve the user's permission scope based on their role
2. Verify parental consent for the target student
3. Embed the query and perform vector similarity search
4. Augment the system prompt with relevant context
5. Send to Claude LLM with conversation history
6. Log the interaction in the audit trail

**Auth Required:** Yes

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | Yes | User's message (1-10000 chars) |
| session_id | string (UUID) | No | Existing session ID for multi-turn chat |
| target_student_id | string (UUID) | No | Student to query about (staff only) |
| course_id | string (UUID) | No | Course context filter |

**Example Request (Student):**

```bash
curl -X POST https://dev.ecoworks.ca:3094/api/chat/message \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How am I doing in math this semester?"
  }'
```

**Example Request (Staff with target student):**

```bash
curl -X POST https://dev.ecoworks.ca:3094/api/chat/message \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are Alex'\''s strengths in mathematics?",
    "target_student_id": "student-uuid-here"
  }'
```

**Example Request (Continuing a session):**

```bash
curl -X POST https://dev.ecoworks.ca:3094/api/chat/message \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you explain that in more detail?",
    "session_id": "session-uuid-here"
  }'
```

**Success Response (200):**

```json
{
  "content": "Based on your academic records, you're performing well in mathematics...",
  "sessionId": "c1d2e3f4-...",
  "messageId": "m1n2o3p4-...",
  "chunksUsed": ["chunk-uuid-1", "chunk-uuid-2"],
  "model": "claude-sonnet-4-20250514",
  "tokenCountInput": 1534,
  "tokenCountOutput": 287,
  "latencyMs": 2150
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "error": "Invalid request", "details": [...] }` | Validation failure (empty message, invalid UUID) |
| 401 | `{ "error": "Missing or invalid authorization header" }` | No or invalid token |
| 403 | `{ "error": "You do not have permission to access this student's data" }` | Target student not in user's scope |
| 503 | `{ "error": "LLM service unavailable", "message": "..." }` | CLAUDE_API_KEY not set or API error |
| 500 | `{ "error": "Chat failed", "message": "..." }` | Unexpected server error |

---

### GET /api/chat/sessions

List the authenticated user's chat sessions, ordered by most recent first.

**Auth Required:** Yes

**Example Request:**

```bash
curl https://dev.ecoworks.ca:3094/api/chat/sessions \
  -H "Authorization: Bearer <token>"
```

**Success Response (200):**

```json
{
  "sessions": [
    {
      "id": "c1d2e3f4-...",
      "user_id": "u1v2w3x4-...",
      "board_id": "b1c2d3e4-...",
      "mode": "student_chat",
      "target_student_id": null,
      "target_course_id": null,
      "llm_provider": "claude",
      "started_at": "2026-02-28T14:30:00.000Z",
      "ended_at": null,
      "message_count": 4
    }
  ]
}
```

Returns up to 20 sessions.

---

### GET /api/chat/sessions/:id

Get a specific chat session with its full message history.

**Auth Required:** Yes (session must belong to the authenticated user)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Session ID |

**Example Request:**

```bash
curl https://dev.ecoworks.ca:3094/api/chat/sessions/c1d2e3f4-... \
  -H "Authorization: Bearer <token>"
```

**Success Response (200):**

```json
{
  "session": {
    "id": "c1d2e3f4-...",
    "user_id": "u1v2w3x4-...",
    "board_id": "b1c2d3e4-...",
    "mode": "student_chat",
    "target_student_id": null,
    "target_course_id": null,
    "llm_provider": "claude",
    "started_at": "2026-02-28T14:30:00.000Z",
    "ended_at": null,
    "message_count": 4
  },
  "messages": [
    {
      "id": "m1n2o3p4-...",
      "session_id": "c1d2e3f4-...",
      "role": "user",
      "content": "How am I doing in math?",
      "chunks_used": [],
      "token_count_input": null,
      "token_count_output": null,
      "latency_ms": null,
      "created_at": "2026-02-28T14:30:01.000Z"
    },
    {
      "id": "m5n6o7p8-...",
      "session_id": "c1d2e3f4-...",
      "role": "assistant",
      "content": "Based on your recent report card...",
      "chunks_used": ["chunk-uuid-1", "chunk-uuid-2"],
      "token_count_input": 1534,
      "token_count_output": 287,
      "latency_ms": 2150,
      "created_at": "2026-02-28T14:30:03.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 404 | `{ "error": "Session not found" }` | Session does not exist or belongs to another user |

---

## Staff

All staff endpoints require the authenticated user to have one of the following roles:
`teacher`, `educational_assistant`, `guidance_counsellor`, `vice_principal`, `principal`, `supply_teacher`.

### GET /api/staff/students

List students within the staff member's permission scope, grouped with their course information.

- Teachers see students in their courses (current + previous academic year)
- Guidance counsellors, principals, and VPs see all students at their school(s)
- Supply teachers see students in their assigned courses (current year only)

**Auth Required:** Yes (staff role)

**Example Request:**

```bash
curl https://dev.ecoworks.ca:3094/api/staff/students \
  -H "Authorization: Bearer <teacher_token>"
```

**Success Response (200):**

```json
{
  "students": [
    {
      "id": "s1t2u3v4-...",
      "name_first": "Alex",
      "name_last": "Johnson",
      "email": "alex.johnson@tvdsb.on.ca",
      "grade": 10,
      "courses": [
        {
          "id": "c1d2e3f4-...",
          "name": "MPM2D - Principles of Mathematics",
          "code": "MPM2D",
          "subject": "Mathematics"
        }
      ]
    }
  ],
  "courses": [
    {
      "id": "c1d2e3f4-...",
      "name": "MPM2D - Principles of Mathematics",
      "code": "MPM2D",
      "subject": "Mathematics"
    }
  ]
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 403 | `{ "error": "Staff access required" }` | User is not a staff role |

---

### GET /api/staff/courses

List the staff member's courses with student counts.

**Auth Required:** Yes (staff role)

**Example Request:**

```bash
curl https://dev.ecoworks.ca:3094/api/staff/courses \
  -H "Authorization: Bearer <teacher_token>"
```

**Success Response (200):**

```json
{
  "courses": [
    {
      "id": "c1d2e3f4-...",
      "name": "MPM2D - Principles of Mathematics",
      "course_code": "MPM2D",
      "subject": "Mathematics",
      "academic_year": "2025-2026",
      "student_count": 28
    }
  ]
}
```

---

### GET /api/staff/class/:courseId/insights

Get data insights for a specific course: student count, document coverage, and source breakdown.

**Auth Required:** Yes (staff role)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| courseId | string (UUID) | Course ID |

**Example Request:**

```bash
curl https://dev.ecoworks.ca:3094/api/staff/class/c1d2e3f4-.../insights \
  -H "Authorization: Bearer <teacher_token>"
```

**Success Response (200):**

```json
{
  "student_count": 28,
  "document_count": 145,
  "students_with_docs": 25,
  "students_without_docs": 3,
  "source_breakdown": {
    "google_classroom_assignment": 56,
    "google_classroom_submission": 42,
    "google_classroom_grade": 28,
    "sis_report_card": 19
  }
}
```

---

### POST /api/staff/report-comments

Generate an Ontario Growing Success-aligned report card comment for a specific student and course. Uses the Context Engine to retrieve relevant academic data and feeds it to Claude for comment generation.

**Auth Required:** Yes (staff role)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| student_id | string (UUID) | Yes | Student to generate comment for |
| course_id | string (UUID) | Yes | Course for the comment |
| term | string | No | Term label (e.g., "Fall 2025") |
| strengths | string[] | No | Teacher-noted strengths |
| growth_areas | string[] | No | Teacher-noted areas for growth |
| tone | "encouraging" \| "balanced" \| "direct" | No | Comment tone (default: "balanced") |

**Example Request:**

```bash
curl -X POST https://dev.ecoworks.ca:3094/api/staff/report-comments \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "s1t2u3v4-...",
    "course_id": "c1d2e3f4-...",
    "term": "Fall 2025",
    "strengths": ["problem solving", "class participation"],
    "growth_areas": ["showing complete solutions"],
    "tone": "encouraging"
  }'
```

**Success Response (200):**

```json
{
  "comment": "Alex has demonstrated strong problem-solving skills and consistently contributes to class discussions. Their work on linear systems showed solid understanding of both graphical and algebraic methods...",
  "learning_skills": "Responsibility: Good, Organization: Good, Independent Work: Excellent, Collaboration: Excellent, Initiative: Good, Self-Regulation: Good",
  "student_name": "Alex Johnson",
  "chunks_used": ["chunk-uuid-1", "chunk-uuid-2", "chunk-uuid-3"],
  "model": "claude-sonnet-4-20250514",
  "latency_ms": 3200
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "error": "Invalid request", "details": [...] }` | Validation failure |
| 403 | `{ "error": "Staff access required" }` | User is not a staff role |
| 403 | `{ "error": "You do not have access to this student" }` | Student not in scope |
| 404 | `{ "error": "Student not found" }` | Invalid student_id |
| 503 | `{ "error": "LLM service unavailable", "message": "..." }` | API key not set |
| 500 | `{ "error": "Report comment generation failed", "message": "..." }` | Unexpected error |

---

## Admin

All admin endpoints require the authenticated user to have one of the following roles:
`board_admin`, `principal`, `vice_principal`.

### POST /api/admin/ingest

Manually ingest a document for a student. The document will be hashed for deduplication, chunked into ~500-token segments, embedded with OpenAI, and stored with vector indexes.

**Auth Required:** Yes (admin role)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| student_email | string (email) | Yes | Student's email (must be in admin's board) |
| source | DocumentSource enum | Yes | Document source type |
| title | string | No | Document title |
| content | string | Yes | Full document text (min 1 char) |
| sensitivity | "standard" \| "sensitive" \| "restricted" | No | Sensitivity level (default: "standard") |
| academic_year | string | No | Academic year (e.g., "2025-2026") |
| metadata | object | No | Additional key-value metadata |

**Valid `source` values:**
`google_classroom_assignment`, `google_classroom_submission`, `google_classroom_grade`, `google_classroom_comment`, `sis_report_card`, `sis_transcript`, `sis_attendance`, `sis_iep`, `assessment_eqao`, `assessment_board`, `library_record`, `teacher_note`, `guidance_note`

**Example Request:**

```bash
curl -X POST https://dev.ecoworks.ca:3094/api/admin/ingest \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "student_email": "alex.johnson@tvdsb.on.ca",
    "source": "teacher_note",
    "title": "Math Progress Note - February 2026",
    "content": "Alex has been showing significant improvement in algebraic reasoning...",
    "sensitivity": "standard",
    "academic_year": "2025-2026",
    "metadata": {
      "course_code": "MPM2D",
      "author": "Sarah Chen"
    }
  }'
```

**Success Response (200):**

```json
{
  "documentId": "d1e2f3g4-...",
  "chunksCreated": 2,
  "embeddingsCreated": 2,
  "duplicate": false
}
```

If the document content was already ingested (same SHA-256 hash):

```json
{
  "documentId": "d1e2f3g4-...",
  "chunksCreated": 0,
  "embeddingsCreated": 0,
  "duplicate": true
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "error": "Invalid request", "details": [...] }` | Validation failure |
| 403 | `{ "error": "Admin access required" }` | User is not an admin role |
| 404 | `{ "error": "Student not found: email@example.com" }` | Student email not found in admin's board |
| 500 | `{ "error": "Ingestion failed", "message": "..." }` | Pipeline error |

---

### POST /api/admin/sync/trigger

Trigger a full Google Classroom sync. Fetches active courses, coursework, and student submissions, then ingests each as a document through the pipeline.

**Auth Required:** Yes (admin role)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| access_token | string | Yes | Google OAuth access token |
| school_id | string (UUID) | Yes | School ID to associate synced data with |

**Example Request:**

```bash
curl -X POST https://dev.ecoworks.ca:3094/api/admin/sync/trigger \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "ya29.a0AfH6...",
    "school_id": "school-uuid-here"
  }'
```

**Success Response (200):**

```json
{
  "coursesProcessed": 5,
  "documentsIngested": 127,
  "errors": []
}
```

If some items fail:

```json
{
  "coursesProcessed": 4,
  "documentsIngested": 98,
  "errors": [
    "Course gc-12345: Permission denied",
    "Submission gc-sub-67890: Rate limit exceeded"
  ]
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "error": "Invalid request", "details": [...] }` | Missing access_token or school_id |
| 403 | `{ "error": "Admin access required" }` | User is not an admin role |
| 500 | `{ "error": "Sync failed", "message": "..." }` | Google API error |

---

### GET /api/admin/sync/google-auth-url

Get a Google OAuth consent URL for authorizing Google Classroom access.

**Auth Required:** Yes (admin role)

**Example Request:**

```bash
curl https://dev.ecoworks.ca:3094/api/admin/sync/google-auth-url \
  -H "Authorization: Bearer <admin_token>"
```

**Success Response (200):**

```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=..."
}
```

---

### GET /api/admin/sync/status

Get document, chunk, and embedding counts for the admin's board.

**Auth Required:** Yes (admin role)

**Example Request:**

```bash
curl https://dev.ecoworks.ca:3094/api/admin/sync/status \
  -H "Authorization: Bearer <admin_token>"
```

**Success Response (200):**

```json
{
  "documents": 42,
  "chunks": 156,
  "embeddings": 156
}
```

---

## Webhooks

### POST /api/webhooks/google

Receives Google Classroom push notification webhooks. Currently a stub that acknowledges receipt and logs the notification.

**Auth Required:** No (Google sends these directly)

**Headers (from Google):**

| Header | Description |
|--------|-------------|
| X-Goog-Resource-State | Event type: "sync" (verification), "update", "delete" |
| X-Goog-Resource-Id | Resource being watched |
| X-Goog-Channel-Id | Notification channel ID |

**Response:** 200 (empty body)

---

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "error": "Short error description",
  "message": "Detailed error message (optional)",
  "details": []
}
```

### Common HTTP Status Codes

| Status | Meaning | Common Causes |
|--------|---------|---------------|
| 400 | Bad Request | Request body validation failure (Zod) |
| 401 | Unauthorized | Missing, expired, or invalid JWT token |
| 403 | Forbidden | User lacks required role or student is out of scope |
| 404 | Not Found | Resource does not exist or belongs to another user |
| 500 | Internal Server Error | Unexpected server failure |
| 503 | Service Unavailable | LLM API key not configured or external API down |

### Validation Error Details

When a 400 error includes `details`, it contains Zod validation issues:

```json
{
  "error": "Invalid request",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "String must contain at least 1 character(s)",
      "path": ["message"]
    }
  ]
}
```
