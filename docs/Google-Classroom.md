# Google Classroom Integration

## Overview

StudentContext AI syncs student academic data from Google Classroom via the Google Classroom API. This provides real-time access to assignments, submissions, grades, and teacher comments.

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
