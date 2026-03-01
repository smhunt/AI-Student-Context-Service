# Aspen SIS Integration — Technical Architecture

## Overview

Aspen (formerly X2 by Follett) is the Student Information System used by 38+ Ontario school boards via an OECM (Ontario Education Collaborative Marketplace) contract. It replaced the legacy Trillium system starting in 2019.

StudentContext AI integrates with Aspen via its REST API and the OneRoster 1.1 standard.

## Aspen Technical Stack

| Aspect | Detail |
|--------|--------|
| **Database** | Microsoft SQL Server |
| **Application Server** | .NET, browser-based SaaS |
| **Hosting** | Fujitsu manages for Ontario boards |
| **API Auth** | OAuth 2.0 Client Credentials |
| **Standards** | OneRoster 1.1, Ed-Fi |
| **Ontario Boards** | 38+ via OECM contract |
| **Replaced** | Trillium (44 boards, 2019 RFP) |
| **Cost** | ~$14.1M over 3 years implementation |

## Integration Architecture

```
┌─────────────────────┐
│  StudentContext AI   │
│  (Node.js/Express)   │
└─────────┬───────────┘
          │
          │ OAuth 2.0 Client Credentials
          │
┌─────────▼───────────┐
│  Aspen REST API     │
│  or OneRoster 1.1   │
│  (HTTPS)            │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│  Aspen App Server   │
│  (.NET / IIS)       │
│  Managed by Fujitsu │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│  SQL Server DB      │
│  (Per-board tenant) │
└─────────────────────┘
```

## API Integration

### Authentication (OAuth 2.0 Client Credentials)

```
POST {aspen_base_url}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={ASPEN_CLIENT_ID}
&client_secret={ASPEN_CLIENT_SECRET}
&scope=oneroster.readonly
```

Response:
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Aspen REST Endpoints (Vendor-Specific)

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/students/{oen}` | Student demographics |
| `GET /api/v1/students/{oen}/reportcards` | Report cards |
| `GET /api/v1/students/{oen}/transcript` | Ontario Student Transcript |
| `GET /api/v1/students/{oen}/attendance` | Attendance records |
| `GET /api/v1/students/{oen}/iep` | Individual Education Plan |
| `GET /api/v1/students/{oen}/eqao` | EQAO assessment results |
| `GET /api/v1/courses/{code}/roster` | Class roster |
| `GET /api/v1/schools/{code}/students` | All students at a school |

### OneRoster 1.1 Endpoints (IMS Global Standard)

| Endpoint | Description |
|----------|-------------|
| `GET /ims/oneroster/v1p1/users` | All users (students, teachers) |
| `GET /ims/oneroster/v1p1/students/{id}/results` | Student grades/results |
| `GET /ims/oneroster/v1p1/classes` | Course sections |
| `GET /ims/oneroster/v1p1/classes/{id}/enrollments` | Class enrollments |
| `GET /ims/oneroster/v1p1/schools/{id}/enrollments` | School enrollments |
| `GET /ims/oneroster/v1p1/orgs` | Organizations (schools, boards) |
| `GET /ims/oneroster/v1p1/academicSessions` | Terms, semesters |

## Data Mapping

### Aspen Entities → document_source Enum

| Aspen Data | document_source | Sensitivity |
|------------|-----------------|-------------|
| Report Cards | `sis_report_card` | standard |
| Ontario Student Transcript (OST) | `sis_transcript` | standard |
| Attendance Records | `sis_attendance` | standard |
| Individual Education Plan (IEP) | `sis_iep` | sensitive |
| EQAO Results | `assessment_eqao` | standard |
| Board Assessments | `assessment_board` | standard |
| Teacher Notes | `teacher_note` | standard |
| Guidance Notes | `guidance_note` | sensitive |

### Ontario-Specific Identifiers

| Identifier | Description |
|------------|-------------|
| **OEN** (Ontario Education Number) | 9-digit unique student ID, issued by Ministry |
| **OnSIS** (Ontario School Information System) | Ministry reporting system |
| **EQAO** | Education Quality and Accountability Office |
| **OSR** (Ontario Student Record) | Official cumulative record |
| **OST** (Ontario Student Transcript) | Credit-bearing course history |

## Sync Architecture

### Full Sync (Nightly Batch)

```
Scheduler → syncBoard(boardId, schoolCodes)
  └─ for each school:
      syncSchool(schoolCode, boardId)
        └─ getSchoolStudents(schoolCode)
        └─ for each student (5 parallel):
            syncStudent(oen, boardId, studentId)
              ├─ getReportCards(oen) → ingest
              ├─ getTranscript(oen) → ingest
              ├─ getAttendance(oen) → ingest
              ├─ getIEP(oen) → ingest
              └─ getEQAO(oen) → ingest
```

- Concurrency: 5 parallel student syncs per school (configurable)
- Deduplication: SHA-256 content hash prevents duplicate documents
- Idempotent: Safe to run multiple times

### Incremental Sync (Webhook)

```
Aspen Webhook → POST /api/webhooks/sis
  └─ { event_type, oen, board_id?, student_id? }
  └─ Resolve student by OEN (if IDs not provided)
  └─ syncStudent(oen, boardId, studentId)
```

Supported event types:
- `student.updated` — Full re-sync
- `reportcard.created` / `reportcard.updated` — Re-sync report cards
- `enrollment.created` / `enrollment.updated` — Re-sync enrollment data
- `attendance.updated` — Re-sync attendance records

## Provider Configuration

### Environment Variables

```bash
# Aspen REST (vendor-specific)
SIS_PROVIDER=aspen
ASPEN_BASE_URL=https://aspen.tvdsb.ca/api
ASPEN_CLIENT_ID=your-client-id
ASPEN_CLIENT_SECRET=your-client-secret

# OneRoster 1.1 (standard protocol)
SIS_PROTOCOL=oneroster
ONEROSTER_BASE_URL=https://aspen.tvdsb.ca
ONEROSTER_CLIENT_ID=your-client-id
ONEROSTER_CLIENT_SECRET=your-client-secret
```

### Provider Selection Logic

```
SIS_PROTOCOL=oneroster → OneRosterSISProvider (works with any SIS)
SIS_PROVIDER=aspen     → AspenSISProvider (vendor-specific REST API)
SIS_PROVIDER=mock      → MockSISProvider (development)
```

## Ontario Board Deployment Notes

### OECM Contract Boards (38+)

All Ontario boards using Aspen have:
- Fujitsu-managed hosting
- Per-board SQL Server tenant
- API access via OAuth 2.0 client credentials
- OneRoster 1.1 endpoints available

### Data Sensitivity

| Data Type | Ontario Regulation | Access |
|-----------|-------------------|--------|
| Demographics | Education Act | Staff only |
| Report Cards | Growing Success | Staff, parents |
| IEPs | PPM 8 | Teacher, guidance, parent |
| OSR | OSR Guideline 2000 | Authorized staff only |
| EQAO | EQAO Act | Staff, parents |
| Attendance | Education Act s.21 | Staff only |

### Privacy (FIPPA / MFIPPA)

- All data access logged in audit trail
- Parental consent required before AI context retrieval
- Board-level data isolation (multi-tenancy)
- No student data stored in LLM provider systems (context passed per-request)
