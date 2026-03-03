# Google Classroom Integration

## Overview

StudentContext AI syncs student academic data from Google Classroom via the Google Classroom API. This provides real-time access to assignments, submissions, grades, and teacher comments.

## Benefits of Google Classroom Integration

Google Workspace for Education is the dominant classroom platform across Ontario school boards. For boards using Google Classroom, this integration transforms a static LMS into a live data source that feeds the AI context engine -- giving every chat response, report card comment, and staff insight a grounding in what is actually happening in the classroom right now.

### Real-Time Assignment and Grade Awareness

When a teacher posts a new assignment in Google Classroom, StudentContext AI ingests the assignment description, due date, and point value. When a student submits their work, the submission details are ingested. When the teacher grades it, the grade and any rubric scores are captured. This means the AI's knowledge of a student's academic performance is as current as the teacher's gradebook.

A student asking "What should I focus on for my upcoming test?" receives advice grounded in their actual assignment scores and submission history -- not generic study tips. A teacher generating a report card comment gets a draft that references the student's real performance trajectory across the semester, not a placeholder narrative.

### Elimination of Manual Data Entry

Without Google Classroom integration, keeping the AI context engine informed about daily classroom activity would require teachers to manually enter information into a separate system. This is unrealistic -- teachers already face significant administrative workload. By syncing directly from Google Classroom, StudentContext AI captures classroom data as a byproduct of the work teachers are already doing. No additional data entry, no duplicate workflows, no change in teacher behavior required.

### Board-Wide Deployment with a Single OAuth Consent

For board-wide deployment, the Google Workspace administrator grants domain-wide delegation to the StudentContext AI OAuth application and pre-authorizes the required read-only scopes. After this one-time administrative action, no individual teacher consent is needed. The sync runs silently across all courses in the board's Google Classroom instance.

This centralized consent model aligns with how Ontario boards manage Google Workspace: the IT department controls application access at the domain level, and individual teachers do not need to approve third-party integrations on a per-course basis.

### Complementary to SIS Data

Google Classroom captures what happens in the classroom day-to-day: assignments, submissions, grades, and teacher comments. The SIS (Aspen) captures the formal academic record: report cards, transcripts, attendance, IEPs, and EQAO results. Together, these two data sources give the context engine a complete picture of each student -- from the macro-level academic trajectory down to individual assignment performance.

A guidance counsellor asking about a student's math progress sees both the Term 1 report card from Aspen and the individual unit assessment scores from Google Classroom. A teacher generating a report card comment has access to the full semester's assignment data, not just their own recollection of a student's work.

### Webhook-Driven Incremental Updates

Beyond the initial full sync, Google Classroom supports push notifications via Google Cloud Pub/Sub. When a student turns in an assignment, when a teacher posts a grade, or when a course roster changes, the webhook triggers an incremental sync for the affected course and student. This keeps the context engine current throughout the school day without running expensive full syncs.

### Privacy-Respecting Read-Only Access

The integration requests only read-only OAuth scopes. StudentContext AI never modifies, creates, or deletes anything in Google Classroom. It reads course information, assignment details, submission states, and grades -- nothing more. The board's Google Classroom data remains entirely under the board's control, and the integration can be revoked at the Google Workspace admin level at any time.

## OAuth 2.0 Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Admin User  │────>│  StudentContext   │────>│  Google OAuth    │
│  (Browser)   │     │  API Server      │     │  Consent Screen  │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
                              ┌─────────────────────────┘
                              │ Authorization Code
                              ▼
                    ┌──────────────────┐     ┌─────────────────┐
                    │  StudentContext   │────>│  Google Token    │
                    │  Token Exchange   │     │  Endpoint        │
                    └──────────────────┘     └────────┬────────┘
                                                       │
                              ┌─────────────────────────┘
                              │ Access Token + Refresh Token
                              ▼
                    ┌──────────────────┐     ┌─────────────────┐
                    │  StudentContext   │────>│  Google Classroom│
                    │  Sync Service    │     │  API v1          │
                    └──────────────────┘     └─────────────────┘
```

### Steps

1. **Admin initiates sync** via Admin Dashboard → "Sync Google Classroom"
2. **Server generates OAuth URL** → `GET /api/admin/sync/google-auth-url`
3. **Admin grants consent** on Google's OAuth consent screen
4. **Google redirects** with authorization code
5. **Server exchanges code** for access + refresh tokens
6. **Sync runs** using the access token

### OAuth Scopes

| Scope | Description |
|-------|-------------|
| `classroom.courses.readonly` | List courses |
| `classroom.coursework.students.readonly` | Read assignments |
| `classroom.rosters.readonly` | Student roster |
| `classroom.student-submissions.students.readonly` | Read submissions + grades |

### Google Workspace Admin Consent

For board-wide deployment, the Google Workspace admin must:

1. Grant domain-wide delegation to the OAuth app
2. Pre-authorize the required scopes
3. No per-teacher consent needed after admin approval

## Accessible Document Types

| Source | document_source Enum | Description |
|--------|---------------------|-------------|
| Course assignments | `google_classroom_assignment` | Assignment title, description, points, due date |
| Student submissions | `google_classroom_submission` | Submission text, links, attachments, state |
| Grades | `google_classroom_grade` | Numeric grade, rubric scores, teacher feedback |
| Comments | `google_classroom_comment` | Teacher comments on submissions |

## Data Flow

```
Google Classroom API
  │
  ├─ List Courses (/courses)
  │   └─ for each course:
  │       ├─ List Coursework (/courseWork)
  │       │   └─ for each assignment:
  │       │       ├─ Ingest assignment as google_classroom_assignment
  │       │       └─ List Student Submissions (/studentSubmissions)
  │       │           └─ for each submission:
  │       │               ├─ Ingest submission details as google_classroom_submission
  │       │               └─ Ingest grade as google_classroom_grade
  │       └─ Map Google students to DB users (by email)
  │
  └─ Documents go through ingestion pipeline:
      ├─ SHA-256 hash → dedup check
      ├─ Store document record
      ├─ Chunk into ~500-token segments (50-token overlap)
      ├─ Generate embeddings (text-embedding-3-small, 1536 dims)
      └─ Store in PostgreSQL + pgvector
```

## Webhook Push Notifications

Google Classroom supports push notifications for real-time updates:

```
Google Cloud Pub/Sub
  │
  ├─ Course changes (student added/removed)
  ├─ Coursework changes (assignment created/updated)
  └─ Submission changes (turned in/graded)
      │
      ▼
POST /api/webhooks/google
  │
  └─ Re-sync affected course/student
```

### Setup

1. Register a Google Cloud project with Pub/Sub enabled
2. Create a Pub/Sub topic for Classroom notifications
3. Subscribe the webhook endpoint to the topic
4. Configure the Classroom API to push to the topic

### Headers

Google sends verification:
- `X-Goog-Resource-State: sync` — Initial verification (respond 200)
- `X-Goog-Resource-State: update` — Data change notification
- `X-Goog-Resource-Id` — Resource identifier
- `X-Goog-Channel-Id` — Subscription channel ID

## Configuration

### Environment Variables

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://dev.ecoworks.ca:3094/api/auth/google/callback
```

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/sync/google-auth-url` | GET | Generate OAuth consent URL |
| `/api/admin/sync/trigger` | POST | Trigger full sync (requires access_token, school_id) |
| `/api/admin/sync/status` | GET | Document/chunk/embedding counts |
| `/api/webhooks/google` | POST | Push notification handler |

## Student Matching

Google Classroom students are matched to our database by email:

```
Google Classroom Student Email → SELECT FROM users WHERE email = ? AND role = 'student'
```

For boards using Google Workspace for Education, student emails follow the board's domain pattern (e.g., `student@learn.tvdsb.ca`).

## Limitations

- Google Classroom API rate limits: 10 requests/second per user
- Attachment content (PDFs, Docs) not directly accessible via Classroom API — requires Google Drive API
- Comment history limited to most recent comments
- Google Classroom does not include attendance or IEP data — those come from the SIS
