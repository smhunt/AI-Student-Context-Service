# StudentContext AI -- 2-Minute Explainer Video Script

**Target runtime:** 2:00 (approximately 300 words at natural speaking pace)
**Audience:** School board superintendents, IT directors, curriculum leads, trustees
**Tone:** Professional, warm, confident. Not salesy -- educational technology that earns trust.

---

## SCRIPT

---

**[0:00 -- 0:15] OPENING: The Problem**

*Visual: A teacher at their desk late at night, surrounded by report cards. Cut to a student typing into ChatGPT and getting a generic, unhelpful response.*

**NARRATOR:**
"Every day, Ontario students ask AI chatbots for help with their schoolwork. And every day, those chatbots answer with no idea who the student is -- their grades, their goals, their learning needs. Meanwhile, teachers spend dozens of hours each term writing report card comments from scratch. There's a better way."

---

**[0:15 -- 0:35] WHAT IT IS**

*Visual: Clean product UI showing the student chat interface. Animated data flow diagram: student question flows through permission checks, consent verification, context retrieval, and back as a personalized response.*

**NARRATOR:**
"StudentContext AI is a middleware layer that connects your board's approved AI tools to each student's actual academic history. Report cards, Google Classroom assignments, attendance records, IEPs -- securely vectorized and instantly searchable. When a student asks 'How am I doing in math?', the AI doesn't guess. It knows."

---

**[0:35 -- 0:55] HOW IT WORKS**

*Visual: Animated RAG pipeline. Query goes in, permission scope filters appear, consent check passes, relevant document chunks light up, augmented prompt sent to LLM, response returns.*

**NARRATOR:**
"Here's how it works. A student or teacher sends a question. StudentContext AI checks their role -- are they a teacher, a guidance counsellor, a parent? It verifies parental consent. Then it searches the student's academic records using the same access boundaries educators already follow. The relevant context is injected into the AI prompt, and a personalized, grounded response comes back. Every retrieval is logged for FIPPA compliance."

---

**[0:55 -- 1:20] WHO BENEFITS**

*Visual: Quick montage -- student getting a helpful, personalized answer. Teacher clicking 'Generate Comments' and getting draft report card comments in seconds. Guidance counsellor viewing a student's full trajectory. Parent toggling consent controls.*

**NARRATOR:**
"Students get a tutor that actually knows their work. Teachers generate Growing Success-aligned report card comments in seconds -- saving ten to fifteen hours per reporting period. Guidance counsellors see a student's complete trajectory across years, including IEPs and assessment data. And parents control exactly which data the AI can access, with the ability to revoke consent at any time."

---

**[1:20 -- 1:40] TRUST AND CONTROL**

*Visual: Security shield icons. Multi-tenant architecture diagram. LLM provider logos (Claude, GPT-4, Gemini) with swap arrows. Aspen SIS logo connecting to 38+ board icons.*

**NARRATOR:**
"Your board stays in control. StudentContext AI supports multiple LLM providers -- Claude, GPT-4, Gemini, and more -- so you're never locked in. It connects directly to Aspen through the OECM contract that thirty-eight Ontario boards already use. Data never leaves your database. Multi-tenant isolation is enforced at every layer. And the built-in billing dashboard lets you set token budgets per school, so there are no surprise costs."

---

**[1:40 -- 1:55] DEPLOYMENT**

*Visual: Docker containers spinning up. A clock showing "under one hour." Admin dashboard showing schools, usage charts, audit logs.*

**NARRATOR:**
"Deployment is straightforward. The entire platform runs as Docker containers. Your IT team can have a development instance running in under an hour. It works with your existing identity provider -- Entra ID, Google, or Clerk -- and syncs with your SIS automatically. No CSV imports. No manual data entry."

---

**[1:55 -- 2:00] CALL TO ACTION**

*Visual: EcoWorks logo. Contact information. "Request a pilot" button.*

**NARRATOR:**
"StudentContext AI. Built for Ontario schools. Built for privacy. Built by EcoWorks."

---

## PRODUCTION NOTES

- **Music:** Light, modern instrumental. Warm but professional. Think education technology, not enterprise SaaS.
- **Pacing:** Allow 1-2 seconds of breathing room between sections. The script reads at ~290 words which allows comfortable delivery at 150 wpm.
- **Visuals:** Product screenshots should use real UI from the platform (student chat, staff portal, admin dashboard, parent consent). Diagrams should match the architecture documentation in docs/README.md.
- **Accessibility:** Include captions. Use high-contrast visuals. Avoid fast-flashing transitions.
- **Versions to consider:**
  - 30-second cut for social media (use the Opening + What It Is sections)
  - 60-second cut for conference presentations (Opening + What It Is + Who Benefits + CTA)
  - Full 2:00 for website landing page and board presentations
