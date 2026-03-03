# StudentContext AI: Infographic Content Spec

**Purpose:** Source-of-truth content for the product overview infographic.
**Audience:** School board superintendents, IT directors, curriculum leads, trustees.

---

## Title

**StudentContext AI: Secure, Personalized Learning for Ontario Schools**

Subtitle: A privacy-first middleware layer that transforms board-approved AI tools into personalized learning companions — grounded in each student's real academic history.

---

## Section 1: The Problem vs. The Solution (Top Row, Three Columns)

### Column 1: Generic AI (The Problem)

**Heading:** Generic AI Guesses

Standard AI chatbots have zero knowledge of the student sitting in front of them. When a student asks "How am I doing in math?", the AI can only offer textbook advice — it has never seen a report card, an assignment, or a grade. Teachers get no help generating personalized report card comments. The AI is powerful but blind.

**Key point:** Generic responses. No student context. No privacy controls.

---

### Column 2: Secure Middleware Retrieval (The Pipeline)

**Heading:** StudentContext AI: Secure Middleware Retrieval

StudentContext AI sits between the user and the AI model. Every request passes through three gates before any student data reaches the LLM:

1. **Identity Verification** — Who is asking? Role-based access control confirms whether the user is a student, teacher, guidance counsellor, principal, parent, or board admin. Each role has different data access boundaries.

2. **Consent Checks** — Has the parent or guardian granted consent for this student's data to be used by AI? Parents control which data sources are included (grades, assignments, IEPs, attendance) and can revoke consent at any time.

3. **Retrieving Relevant Academic Data** — The student's question is converted into a vector embedding. The system searches the student's academic document chunks using vector similarity, filtered by the user's permission scope and sensitivity level. Only authorized, consented data is retrieved.

The retrieved context is injected into the AI prompt. The AI responds with a personalized, grounded answer. Every retrieval is logged for FIPPA compliance auditing.

**Key point:** Three security gates. No data reaches the AI without passing all three.

---

### Column 3: Grounded Context (The Data Sources)

**Heading:** Grounded in Real Academic Data

StudentContext AI doesn't hallucinate student information — it retrieves it from authoritative sources:

- **Report Cards** — Term grades, teacher narratives, learning skills (Growing Success framework)
- **Google Classroom** — Assignments, submissions, grades, teacher comments, course rosters
- **IEPs** — Individual Education Plans with accommodations, modifications, and goals (sensitive access only)
- **Transcripts** — Full academic history across years and schools
- **Attendance** — Patterns, absences, lates
- **EQAO Assessments** — Provincial standardized test results
- **Board Assessments** — Literacy diagnostics, numeracy screeners
- **Teacher Notes** — Progress observations, parent communication logs
- **Guidance Notes** — Pathway planning, post-secondary discussions (restricted access)

**Aspen SIS Integration:** Connects directly to Aspen (Follett) via the OECM contract used by 38+ Ontario school boards. OneRoster 1.1 standard support means compatibility with PowerSchool, Veracross, and other SIS platforms.

**Google Classroom Integration:** OAuth 2.0 domain-wide delegation. Automatic sync of courses, assignments, submissions, grades, and comments. Webhook-driven incremental updates keep data current throughout the day.

**Key point:** 12 document source types. Two major data integrations. Real data, not guesses.

---

## Section 2: Impact — Security, Control, and Efficiency (Bottom Left, Three Cards)

### Card 1: 10-15 Hours Saved Per Term

Ontario teachers spend an estimated 10-15 hours per reporting period writing report card comments for each class. StudentContext AI generates Growing Success-aligned draft comments in seconds, grounded in the student's actual assignments, grades, and teacher feedback from Google Classroom and the SIS. Teachers review and adjust — they don't start from scratch.

**Stat:** 10-15 hours saved per class, per reporting period
**Detail:** Growing Success-aligned draft comments generated from real student data in seconds

---

### Card 2: Total Parent and Board Control

**Parents** can grant or revoke AI data consent at any time through the Parent Consent Portal. They choose which data sources the AI can access — Google Classroom grades but not IEPs, for example. Revocation is immediate and auditable.

**Boards** set per-school token budgets with configurable monthly limits. A 90% warning threshold and hard 100% cutoff prevent surprise costs. Per-request cost tracking provides complete transparency into AI spending per school, per role, per LLM provider. Boards choose their preferred LLM provider and can switch at any time.

**Stat:** Instant consent revocation. Per-school token budgets. Full cost transparency.

---

### Card 3: Enterprise-Grade Security and Privacy

- **Multi-tenant isolation** — Board A cannot access Board B's data. Enforced at the database level with row-level security policies and board_id scoping on every table.
- **No data leaves your database** — Student context is passed to the LLM per-request and never persists on provider servers. The board's PostgreSQL database is the only data store.
- **FIPPA compliance auditing** — Every context retrieval generates a timestamped audit entry recording who accessed what data, for which student, at what sensitivity level.
- **Sensitivity classification** — Documents are classified as standard (grades, assignments), sensitive (IEPs, behavioural notes), or restricted (psychological assessments, CAS involvement). Role determines maximum sensitivity access.

**Stat:** Row-level security. Full audit trail. Three sensitivity tiers. Zero data persistence on LLM servers.

---

## Section 3: Stakeholder Benefits (Bottom Right, Five Columns)

### Teachers

- Generate Growing Success-aligned report card comments in seconds from real student data
- Instant class-level insights: coverage gaps, sync status, document counts per student
- Student selector scoped to actual course roster — no accidental cross-class data access
- Supply teachers get need-to-know context for assigned classes only, limited to standard sensitivity

### Students

- A personalized AI tutor that knows their actual grades, assignments, and feedback
- Ask "How am I doing in math?" and get a response grounded in their MPM2D Unit 3 score, not a generic answer
- Age-appropriate, encouraging responses that never expose raw grades or sensitive data
- Context from Google Classroom and SIS means the AI understands what they've studied and where they need practice

### Guidance Counsellors

- Instant access to a student's complete academic trajectory across years
- Full-depth records: report cards, transcripts, IEPs, attendance, EQAO, guidance notes
- Restricted sensitivity access — see what teachers cannot, for students on their caseload
- Every context retrieval logged for professional accountability and FIPPA compliance

### Parents

- Grant or revoke AI data consent at any time through the Parent Consent Portal
- Granular control: choose which data sources the AI may access per child
- Ask about their child's progress and receive plain-language, jargon-free responses
- Only standard-sensitivity sources are included in parent-facing responses — never IEPs or restricted data

### IT Teams

- Full platform runs as Docker containers — development instance in under one hour
- Works with existing identity providers: Microsoft Entra ID, Google Workspace, or Clerk SSO
- Connects directly to Aspen SIS via OAuth 2.0 — no CSV imports, no FTP, no manual data entry
- Multi-tenant by default: one deployment serves all schools in the board
- Automatic nightly batch sync + webhook-driven incremental updates keep data current

---

## Section 4: Vendor Flexibility (Optional Footer)

**No lock-in at any layer:**

| Layer | Options |
|-------|---------|
| **LLM Provider** | Claude, GPT-4o, Gemini, Llama (Groq), Mistral — switch anytime |
| **Identity Provider** | Microsoft Entra ID, Google Workspace, Clerk SSO |
| **Student Information System** | Aspen (Follett), any OneRoster 1.1-compliant SIS |
| **Chat Frontend** | Native UI, OpenWebUI, any MCP-enabled tool (Claude Desktop) |
| **Deployment** | Docker Compose, cloud VM, on-premise server |

---

## Corrections from Previous Version

| Issue | Previous | Corrected |
|-------|----------|-----------|
| Typo | "IFPs" | **IEPs** (Individual Education Plans) |
| OCR error | "S8 Ontario boards" | **38** Ontario boards |
| Missing stakeholder | — | **Guidance Counsellors** added (full trajectory access, restricted sensitivity) |
| Missing stakeholder | — | **Parents** added (consent control, plain-language responses) |
| Incomplete data sources | Only mentioned grades, IFPs, assignments | Added **12 document source types** with full list |
| Missing pipeline detail | Showed three gates without explanation | Added **detailed gate descriptions** with privacy implications |
| Missing vendor flexibility | Not shown | Added **vendor flexibility table** showing no lock-in at any layer |

---

*Built by EcoWorks Web Architecture Inc. | Version 1.0.0*
