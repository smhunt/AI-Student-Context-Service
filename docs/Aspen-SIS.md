# Aspen SIS Integration -- Technical Architecture

## Overview

Aspen (formerly X2 by Follett) is the Student Information System used by 38+ Ontario school boards via an OECM (Ontario Education Collaborative Marketplace) contract. It replaced the legacy Trillium system starting in 2019.

StudentContext AI integrates with Aspen via its REST API and the OneRoster 1.1 standard.

## Benefits of SIS Integration

The Student Information System is the authoritative source of truth for student demographics, academic records, attendance, Individual Education Plans, and assessment results in every Ontario school board. Without SIS integration, any AI tool that claims to "know" a student is operating on incomplete or manually-entered data. StudentContext AI's direct integration with Aspen eliminates this gap.

### 38+ Ontario Boards Ready on Day One

Because 38+ Ontario boards already use Aspen through the OECM contract, StudentContext AI does not require boards to adopt new data infrastructure. The integration uses the same OAuth 2.0 client credentials and REST API endpoints that Aspen already exposes. Deployment for a new board requires only API credentials from the Fujitsu-managed Aspen instance -- no custom data exports, no CSV pipelines, no FTP transfers, and no middleware ETL jobs.

This means a board can move from contract signing to live student data ingestion in days rather than months.

### Automatic, Continuous Data Sync

Manual data entry is the enemy of accurate AI context. StudentContext AI runs nightly batch syncs that pull the latest report cards, transcripts, attendance records, IEPs, and EQAO results for every student in the board. When Aspen data changes between nightly syncs, webhook-driven incremental syncs ensure the context engine reflects the update within minutes.

Every sync is idempotent and deduplicated. If the same report card is synced twice, the SHA-256 content hash prevents duplicate document creation. This means syncs can run as frequently as needed without inflating the vector database or generating redundant embeddings.

### Ontario-Specific Data Structures Understood Natively

StudentContext AI maps Aspen data to Ontario-specific document structures: Ontario Student Transcripts (OSTs), Growing Success report cards, IEPs conforming to PPM 8, EQAO assessment results, and attendance records aligned with Education Act s.21 requirements. Ontario Education Numbers (OENs) are used as the canonical student identifier for cross-system matching.

This is not a generic SIS connector that requires custom field mapping for each board. The Aspen integration understands Ontario's educational data structures out of the box.

### Sensitivity-Aware Ingestion

Not all SIS data carries the same privacy weight. Report cards and transcripts are classified as `standard` sensitivity -- accessible to teachers, guidance counsellors, principals, and parents. IEPs and guidance notes are classified as `sensitive` or `restricted`, accessible only to roles that the Ontario Education Act and board policy authorize. StudentContext AI applies these sensitivity classifications automatically during ingestion, ensuring that the permission model is enforced from the moment data enters the system.

### OneRoster 1.1 for Vendor-Agnostic Compatibility

While the Aspen-specific REST API provides the deepest integration, StudentContext AI also supports the IMS Global OneRoster 1.1 standard. This means the same integration architecture works with any OneRoster-compliant SIS -- including PowerSchool, Veracross, and other systems used by Ontario Catholic boards, private schools, and boards outside Ontario.

A board evaluating StudentContext AI does not need to commit to Aspen. If the board later migrates from Aspen to another SIS that supports OneRoster, the switch requires only updating environment variables -- no code changes, no data migration, no re-deployment.

### Reduced Administrative Burden

Without SIS integration, keeping an AI context engine current requires someone to manually export data, format it, and upload it. For a board with 25,000 students across 40 schools, this is operationally impossible at any meaningful frequency. Automated SIS sync makes the context engine self-maintaining: as teachers enter grades, as attendance is recorded, as IEPs are updated -- the AI's knowledge base reflects these changes automatically.

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
