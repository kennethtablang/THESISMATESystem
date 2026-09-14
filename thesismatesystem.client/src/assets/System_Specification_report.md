# ThesisMate System — Functional & Non-Functional Specifications

**Version:** 2.0
**Date:** 2026-08-22
**Project:** ThesisMate — Thesis and Capstone Management System
**Institution:** Pangasinan State University — Lingayen Campus
**Baseline commit:** `f130fd2` (+ 41 uncommitted working-tree files)

> **Purpose of this document.** This is a status-bearing specification. Every requirement below was
> verified against the current source tree, not against the design intent. It supersedes
> `REQUIREMENTS_SPECIFICATION.md` (v1.0, 2026-06-29) and serves as the basis for reporting what is
> finished and what remains to be accomplished.

**Status legend**

| Mark | Meaning |
|:---:|---|
| ✅ | **Implemented** — code exists end-to-end (API + service + UI where applicable) |
| ⚠️ | **Partial** — works, but with a stated limitation or missing sub-capability |
| ❌ | **Not implemented** — planned or expected, but absent from the codebase |

---

## 1. System Overview

ThesisMate is a web-based platform managing the full lifecycle of undergraduate thesis and capstone
projects — from group formation and classroom enrollment, through chapter and document review,
real-time collaborative manuscript authoring, consultation scheduling, and defense scheduling and
rating, to final outcome recording and reporting.

### 1.1 Technology Stack (as built)

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React + Vite | React 19.2, Vite 8.0 |
| Styling | Tailwind CSS | 3.4 |
| Routing | React Router DOM | 7.17 |
| Rich-text editor | TipTap | 3.27 |
| CRDT / collaboration | Yjs + y-prosemirror + y-protocols | 13.6 |
| Real-time transport | SignalR client | 10.0 |
| Calendar UI | FullCalendar (daygrid, timegrid, list, interaction) | 6.1 |
| Client-side export | `docx`, `exceljs`, `xlsx`, `mammoth`, `docx-preview`, `diff` | — |
| Sanitisation | DOMPurify | 3.4 |
| Backend | ASP.NET Core Web API | **.NET 10** |
| ORM | Entity Framework Core (SQL Server) | 10.0.9 |
| Identity / auth | ASP.NET Core Identity + JWT Bearer | 10.0.9 |
| Object mapping | AutoMapper | 13.0.1 (pinned to last MIT release) |
| PDF generation | QuestPDF | 2025.7 (Community licence) |
| DOCX generation | DocumentFormat.OpenXml + HtmlToOpenXml | 3.2 / 2.4 |
| API docs | Swashbuckle / Swagger UI | 10.2 |
| Real-time server | SignalR Hub (`/hubs/manuscript`) | — |
| Database | SQL Server (LocalDB in development) | — |

> **Note:** v1.0 of the SRS recorded the stack as ASP.NET Core 8 / React 18. The project has since
> been migrated to **.NET 10 and React 19**; this document reflects the built state.

### 1.2 User Roles

| Role | Description |
|---|---|
| **SuperAdmin** | Platform owner. Full system access, plus exclusive account-recovery powers (force password reset, email change, 2FA override). |
| **Admin** | Department coordinator. Manages classrooms, groups, defense scheduling, rubrics, and evaluation controls. |
| **Faculty** | Unified role. Acts as Adviser, Faculty-in-Charge (FIC), or Panel member depending on assignment context. |
| **Student** | Enrolled thesis/capstone student and member of a capstone group. |

### 1.3 Architecture

- **Backend:** thin controllers → interface-backed scoped services → EF Core `AppDbContext`.
  13 controllers, 15 services, 27 entity models, 1 SignalR hub.
- **Authorization:** ASP.NET Identity roles at the controller level, plus a shared
  `IGroupAccessChecker` that resolves *per-group* access (member / adviser / FIC / assigned panelist /
  admin) for every group-scoped endpoint.
- **Frontend:** 35 route-level pages, 11 shared UI components, `AuthContext` + `ThemeContext`,
  single `api.js` service layer.

---

## 2. Functional Requirements

### 2.1 Authentication & Account Management

| ID | Requirement | Status |
|---|---|:---:|
| FR-AUTH-01 | Users register with full name, email, and password | ✅ |
| FR-AUTH-02 | Verification email is sent on registration; account inactive until verified | ✅ |
| FR-AUTH-03 | Users log in with email and password | ✅ |
| FR-AUTH-04 | Optional two-factor authentication (2FA) via email OTP, with enable / verify-setup / disable flow | ✅ |
| FR-AUTH-05 | Password reset via emailed reset link | ✅ |
| FR-AUTH-06 | JWT access tokens issued on login and validated on every protected request | ✅ |
| FR-AUTH-07 | Self-service profile page (name, bio, contact number, profile photo) | ✅ |
| FR-AUTH-08 | Role-based access control (RBAC) enforced on all API endpoints | ✅ |
| FR-AUTH-09 | Self-service password change for authenticated users | ✅ |
| FR-AUTH-10 | Account lockout after 5 failed attempts for 15 minutes | ✅ |
| FR-AUTH-11 | `LastActive` timestamp updated per authenticated request via middleware | ✅ |
| FR-AUTH-12 | Refresh-token rotation / silent session renewal | ❌ |

**Endpoints:** `POST /api/auth/login`, `/register`, `/verify-email`, `/forgot-password`,
`/reset-password`, `/change-password`, `/2fa/{status,enable,verify-setup,disable,login}`,
`GET|PUT /api/auth/profile`.

---

### 2.2 User Management (Admin / SuperAdmin)

| ID | Requirement | Status |
|---|---|:---:|
| FR-USER-01 | Paginated, searchable list of all registered users | ✅ |
| FR-USER-02 | Admins promote or demote a user's role | ✅ |
| FR-USER-03 | SuperAdmins may promote users to Admin | ✅ |
| FR-USER-04 | Admins deactivate or reactivate user accounts | ✅ |
| FR-USER-05 | Advisers page lists Faculty available for adviser assignment, filterable by name | ✅ |
| FR-USER-06 | SuperAdmin may force-reset any user's password | ✅ |
| FR-USER-07 | SuperAdmin may change any user's email address | ✅ |
| FR-USER-08 | SuperAdmin may force-enable or force-disable a user's 2FA (account recovery) | ✅ |
| FR-USER-09 | Bulk user import (CSV / Excel roster upload) | ❌ |
| FR-USER-10 | Admin-facing audit-log viewer | ❌ |

---

### 2.3 Classroom Management

| ID | Requirement | Status |
|---|---|:---:|
| FR-CLASS-01 | Faculty (FIC) creates a classroom with name, academic year, description | ✅ |
| FR-CLASS-02 | System generates a unique join code per classroom | ✅ |
| FR-CLASS-03 | Students join via join code | ✅ |
| FR-CLASS-04 | Admins invite students by email; students accept invitations | ✅ |
| FR-CLASS-05 | Faculty post announcements; enrolled students receive in-app notifications | ✅ |
| FR-CLASS-06 | Faculty view all enrolled students | ✅ |
| FR-CLASS-07 | Admins view and manage all classrooms institution-wide | ✅ |
| FR-CLASS-08 | Join code may be regenerated (invalidating the previous code) | ✅ |
| FR-CLASS-09 | Groups may be created within, or assigned to, a classroom | ✅ |
| FR-CLASS-10 | Classroom logo / banner image upload | ⚠️ Group logos implemented; classroom-level banner not present |
| FR-CLASS-11 | Faculty may remove an enrollment | ❌ No delete-enrollment endpoint |

---

### 2.4 Capstone Group Management

| ID | Requirement | Status |
|---|---|:---:|
| FR-GROUP-01 | Admins create groups with name, academic year, section, adviser | ✅ |
| FR-GROUP-02 | Admins add or remove student members | ✅ |
| FR-GROUP-03 | Group status: Active, Completed, Archived | ✅ |
| FR-GROUP-04 | Admins assign a Faculty member as group adviser | ✅ |
| FR-GROUP-05 | Group logo upload and retrieval | ✅ |
| FR-GROUP-06 | Group detail page shows members, chapters, documents, features, deadlines | ✅ |
| FR-GROUP-07 | Multiple named group deadlines (create, update, delete, list) | ✅ |
| FR-GROUP-08 | Post-defense outcome recording: Defense Result, Revision Level, Requires Re-Defense flag | ✅ |
| FR-GROUP-09 | Students may update their group's project title / version | ✅ |
| FR-GROUP-10 | Faculty may list groups where they serve as an assigned panelist | ✅ |
| FR-GROUP-11 | Group archiving | ✅ |
| FR-GROUP-12 | Per-group access resolution shared across all group-scoped endpoints (`IGroupAccessChecker`) | ✅ |

---

### 2.5 Chapter Submission & Review

| ID | Requirement | Status |
|---|---|:---:|
| FR-CHAP-01 | Students submit individual chapters (Ch.1–5 + front matter) for adviser review | ✅ |
| FR-CHAP-02 | Chapter status: PendingReview, UnderRevision, Approved | ✅ |
| FR-CHAP-03 | Advisers approve a chapter or request revisions | ✅ |
| FR-CHAP-04 | Revision notes stored per chapter; student notified | ✅ |
| FR-CHAP-05 | Full version history per chapter | ✅ |
| FR-CHAP-06 | Chapter view lists all sections with current approval status | ✅ |
| FR-CHAP-07 | Access-checked chapter file download | ✅ |
| FR-CHAP-08 | Finalize a chapter into a formal document submission | ✅ |

---

### 2.6 Document Submission & Review

| ID | Requirement | Status |
|---|---|:---:|
| FR-DOC-01 | Upload document files (PDF/DOC/DOCX) per section — 15 defined sections | ✅ |
| FR-DOC-02 | Statuses: Draft, SubmittedForReview, NeedsRevision, Approved | ✅ |
| FR-DOC-03 | Students submit a draft to the adviser for review | ✅ |
| FR-DOC-04 | Advisers approve or request revision | ✅ |
| FR-DOC-05 | Approval auto-posts a system comment | ✅ |
| FR-DOC-06 | Revision request auto-posts a system comment | ✅ |
| FR-DOC-07 | Manual comments on any document; commenters notified | ✅ |
| FR-DOC-08 | Side-by-side version comparison with textual diff | ✅ |
| FR-DOC-09 | Adviser next/previous navigation across submitted documents | ✅ |
| FR-DOC-10 | Upload a new version of an existing document; full version list | ✅ |
| FR-DOC-11 | Advisers list all documents across their advisees | ✅ |
| FR-DOC-12 | Admins list all documents institution-wide | ✅ |
| FR-DOC-13 | Access-checked download; direct static access to `/uploads/documents` is blocked | ✅ |
| FR-DOC-14 | In-browser DOCX preview (`docx-preview` / `mammoth`) | ✅ |
| FR-DOC-15 | Document deletion (Student, Admin, SuperAdmin) | ✅ |

---

### 2.7 Manuscript Collaboration Editor

| ID | Requirement | Status |
|---|---|:---:|
| FR-MAN-01 | Shared per-group manuscript workspace divided into sections | ✅ |
| FR-MAN-02 | Real-time multi-user editing over SignalR | ✅ |
| FR-MAN-03 | **Conflict-free concurrent editing via Yjs CRDT** (`SignalRYjsProvider`), server-persisted `YjsState` | ✅ |
| FR-MAN-04 | Live collaborative cursors and presence awareness | ✅ |
| FR-MAN-05 | Section-level threaded comments between students and adviser | ✅ |
| FR-MAN-06 | Adviser inline revision notes on manuscript sections | ✅ |
| FR-MAN-07 | Timestamped manuscript snapshots (versions) | ⚠️ `ManuscriptSnapshot` entity and persistence exist; **restore-from-snapshot UI is not exposed** |
| FR-MAN-08 | Members vote to finalize a manuscript; cast and retract votes; vote status view | ✅ |
| FR-MAN-09 | Adviser opens a revision round; revision summary view for both sides | ✅ |
| FR-MAN-10 | Image upload into the manuscript, validated by extension allowlist **and magic-byte check** | ✅ |
| FR-MAN-11 | Rich-text formatting: tables, text align, colour, highlight, font family, underline, images | ✅ |
| FR-MAN-12 | **Grammar and spelling check** with inline decorations (LanguageTool API, 2 s debounce, 20 000-char cap) | ⚠️ Depends on the public `api.languagetool.org` endpoint — unauthenticated, rate-limited, no self-hosted fallback |
| FR-MAN-13 | Export manuscript to formatted DOCX (1″ margins, 1.5″ gutter, page numbers, Letter size) | ✅ |
| FR-MAN-14 | Large-payload support for paste operations (4 MB SignalR receive limit) | ✅ |
| FR-MAN-15 | Offline editing with reconnection replay | ❌ |

---

### 2.8 Consultation Management

| ID | Requirement | Status |
|---|---|:---:|
| FR-CON-01 | Faculty create consultation schedules with date, time, mode (In-Person / Online), and slot capacity | ✅ |
| FR-CON-02 | Schedule status: Open, Full, Closed, Cancelled | ✅ |
| FR-CON-03 | Students browse available slots and submit a request | ✅ |
| FR-CON-04 | Faculty approve or reject a request; student notified | ✅ |
| FR-CON-05 | Faculty log consultation records (notes, date, attendees) per group | ✅ |
| FR-CON-06 | Students view a consultation calendar of approved consultations | ✅ |
| FR-CON-07 | Consultation history accessible per group for monitoring and reporting | ✅ |
| FR-CON-08 | Faculty edit and delete their own consultation logs | ✅ |
| FR-CON-09 | Faculty view their own schedules (`my-schedules`) | ✅ |
| FR-CON-10 | Calendar sync / `.ics` export to external calendars | ❌ |

---

### 2.9 Defense Scheduling

| ID | Requirement | Status |
|---|---|:---:|
| FR-DEF-01 | Drag-and-drop defense scheduling on a FullCalendar board | ✅ |
| FR-DEF-02 | Event records group, phase, date/time, venue, duration, panelists | ✅ |
| FR-DEF-03 | Phases: TitleDefense, ProposalDefense, FinalDefense, ReDefense | ✅ |
| FR-DEF-04 | Statuses: Scheduled, Rescheduled, Cancelled, Completed | ✅ |
| FR-DEF-05 | Admins edit a scheduled defense | ✅ |
| FR-DEF-06 | Admins cancel a defense; panelists and group notified | ✅ |
| FR-DEF-07 | Panel members assigned per defense from the Faculty roster | ✅ |
| FR-DEF-08 | Faculty view defenses assigned to them | ✅ |
| FR-DEF-09 | Post-defense outcome recording (see FR-GROUP-08) | ✅ |
| FR-DEF-10 | Templated defense notification emails (`DefenseEmailTemplates`) | ✅ |
| FR-DEF-11 | Defense grid export to Excel (`exportDefenseGrid.js`) | ✅ |
| FR-DEF-12 | Panelist double-booking / venue-conflict detection | ❌ |

---

### 2.10 Defense Rubric & Rating

| ID | Requirement | Status |
|---|---|:---:|
| FR-RUB-01 | Admins create, edit, and delete rubric criteria per defense phase | ✅ |
| FR-RUB-02 | Each criterion has name, description, weight (%), and maximum score | ✅ |
| FR-RUB-03 | Admins toggle whether the rating form is open for a specific defense | ✅ |
| FR-RUB-04 | Assigned panelists score each criterion when rating is open | ✅ |
| FR-RUB-05 | Weighted score per criterion and consolidated total per panelist | ✅ |
| FR-RUB-06 | Consolidated panel view: per-criterion averages and overall group score | ✅ |
| FR-RUB-07 | Panelists add qualitative comments alongside scores | ✅ |
| FR-RUB-08 | Admins finalize a defense, locking ratings | ✅ |
| FR-RUB-09 | Rubric templates reusable across academic years | ❌ |

---

### 2.11 System Feature Tracker (Requirements Tracker)

| ID | Requirement | Status |
|---|---|:---:|
| FR-SFT-01 | Faculty and Admins create system requirement features within a group's tracker | ✅ |
| FR-SFT-02 | Features categorised as Functional or Non-Functional | ✅ |
| FR-SFT-03 | Status: NotStarted, InProgress, Completed, NeedsRevision | ✅ |
| FR-SFT-04 | Advisers and Admins update a feature's status | ✅ |
| FR-SFT-05 | Students may set status to "In Progress" only | ✅ |
| FR-SFT-06 | Status changes auto-post a system comment naming the actor and new status | ✅ |
| FR-SFT-07 | Urgency levels: Low, Medium, High, Critical | ✅ |
| FR-SFT-08 | Urgency shown as a colour-coded badge on every feature card | ✅ |
| FR-SFT-09 | Students submit a test result: Passed / Failed, with optional note | ✅ |
| FR-SFT-10 | Test results auto-post a system comment | ✅ |
| FR-SFT-11 | Students upload screenshots as evidence | ✅ |
| FR-SFT-12 | Threaded comments from members, adviser, and assigned panelists | ✅ |
| FR-SFT-13 | System-generated comments are immutable (delete returns 403) | ✅ |
| FR-SFT-14 | Panelists may read and comment, but not change status or urgency | ✅ |
| FR-SFT-15 | Gantt chart date planning (planned / actual start and end) | ✅ |
| FR-SFT-16 | Admins may view any group's tracker | ✅ |
| FR-SFT-17 | Sidebar lists all groups with a "Panel" badge where the user is a panelist | ✅ |
| FR-SFT-18 | Screenshot preview panel with image navigation | ✅ |
| FR-SFT-19 | Feature dependency links / blocking relationships | ❌ |

---

### 2.12 Monitoring Dashboard

| ID | Requirement | Status |
|---|---|:---:|
| FR-MON-01 | Admins and SuperAdmins view an institution-wide monitoring dashboard | ✅ |
| FR-MON-02 | Aggregate statistics: total/active groups, students, chapter approval rates, defense counts per phase | ✅ |
| FR-MON-03 | Per-group progress cards: chapter completion %, defense status, document status | ✅ |
| FR-MON-04 | Filters by academic year and group status | ✅ |
| FR-MON-05 | Faculty see monitoring scoped to their assigned groups | ✅ |
| FR-MON-06 | Students see monitoring for their own group (`my-group`) | ✅ |
| FR-MON-07 | Role-aware analytics dashboard as the post-login landing page | ✅ |
| FR-MON-08 | Historical trend charts across academic years | ❌ |

---

### 2.13 Reports

| ID | Requirement | Status |
|---|---|:---:|
| FR-REP-01 | Per-group progress report, generated as PDF (QuestPDF) | ✅ |
| FR-REP-02 | Milestone completion report by academic year (PDF) | ✅ |
| FR-REP-03 | Defense outcome report per defense schedule (PDF) | ✅ |
| FR-REP-04 | All-groups report, filterable by adviser, academic year, and date range (PDF) | ✅ |
| FR-REP-05 | Reports include chapter statuses, document statuses, consultation counts, defense history | ✅ |
| FR-REP-06 | Excel/CSV export of report data | ⚠️ Client-side Excel export exists for the **defense grid only**; server reports are PDF-only |
| FR-REP-07 | Scheduled or emailed report delivery | ❌ |

---

### 2.14 Notifications

| ID | Requirement | Status |
|---|---|:---:|
| FR-NOT-01 | In-app notifications across 20 event types (chapter, document, consultation, defense, classroom, manuscript, deadline, system feature) | ✅ |
| FR-NOT-02 | Unread badge count in the top navigation bar | ✅ |
| FR-NOT-03 | Mark one, or all, notifications as read | ✅ |
| FR-NOT-04 | Each notification deep-links to its related resource | ✅ |
| FR-NOT-05 | Toast notifications for all user-initiated actions (react-toastify) | ✅ |
| FR-NOT-06 | Transactional email delivery (verification, reset, OTP, defense notices) | ✅ |
| FR-NOT-07 | **Real-time push of in-app notifications** | ❌ SignalR is used for the manuscript hub only; the notification badge relies on request-time fetches |
| FR-NOT-08 | Per-user notification preferences / email digest opt-in | ❌ |

---

### 2.15 Cross-Cutting UI Features

| ID | Requirement | Status |
|---|---|:---:|
| FR-UI-01 | Global command-palette search over pages, groups, and users (keyboard-navigable, hotkey-triggered) | ✅ |
| FR-UI-02 | Dark / light theme toggle, persisted to `localStorage` | ✅ |
| FR-UI-03 | Role-aware sidebar navigation | ✅ |
| FR-UI-04 | Shared UI kit: Badge, EmptyState, Modal, Pagination, Spinner, GanttChart, ImagePreviewPanel | ✅ |
| FR-UI-05 | Sortable table hook (`useSort`) | ✅ |
| FR-UI-06 | Interactive Swagger UI with JWT bearer authorisation | ✅ |

---

## 3. Non-Functional Requirements

### 3.1 Security

| ID | Requirement | Status |
|---|---|:---:|
| NFR-SEC-01 | All API routes require a valid JWT except login, register, verify-email, forgot/reset-password, and group-logo retrieval | ✅ |
| NFR-SEC-02 | Passwords hashed by ASP.NET Core Identity; plaintext never stored | ✅ |
| NFR-SEC-03 | Role-based authorization enforced at the API layer; client-side guards are supplementary | ✅ |
| NFR-SEC-04 | Password policy: minimum 8 characters, at least one digit | ✅ |
| NFR-SEC-05 | Account lockout: 5 failed attempts → 15-minute lockout | ✅ |
| NFR-SEC-06 | **Per-group authorization via `IGroupAccessChecker`** on every group-scoped endpoint, closing IDOR exposure | ✅ |
| NFR-SEC-07 | Upload extension allowlist (`UploadValidation`): documents `.pdf/.doc/.docx`, images `.jpg/.jpeg/.png/.gif/.webp` | ✅ |
| NFR-SEC-08 | Magic-byte content verification on manuscript image uploads | ✅ |
| NFR-SEC-09 | `X-Content-Type-Options: nosniff` on all static responses | ✅ |
| NFR-SEC-10 | Direct static access to `/uploads/documents` and `/uploads/chapters` returns 404; files served only through access-checked download endpoints | ✅ |
| NFR-SEC-11 | System-generated comments immutable; delete returns 403 | ✅ |
| NFR-SEC-12 | Data protection keys persisted to disk so email tokens survive restarts | ✅ |
| NFR-SEC-13 | CORS restricted to the configured SPA origin with credentials | ✅ |
| NFR-SEC-14 | HTTPS redirection enforced | ✅ |
| NFR-SEC-15 | HTML sanitised client-side with DOMPurify before render | ✅ |
| NFR-SEC-16 | Upload size ceiling of 50 MB (multipart body limit) | ✅ |
| NFR-SEC-17 | Audit logging of security-relevant events | ⚠️ `AuditLog` entity exists but is written **only by `AuthService`**; group, defense, document, and role-change mutations are not audited, and there is no viewer |
| NFR-SEC-18 | **Secrets kept out of source control** | ❌ `appsettings.json` commits the JWT signing key and a live SMTP app password |
| NFR-SEC-19 | Rate limiting on authentication and upload endpoints | ❌ Only Identity's per-account lockout applies; no IP-based throttling |
| NFR-SEC-20 | Server-side upload **size** validation per endpoint | ⚠️ Global 50 MB form limit only; no per-endpoint size checks |
| NFR-SEC-21 | Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy) | ❌ Only `nosniff` is set |
| NFR-SEC-22 | Refresh-token rotation and server-side token revocation | ❌ |

### 3.2 Performance

| ID | Requirement | Status |
|---|---|:---:|
| NFR-PER-01 | List endpoints respond within 2 s for datasets up to 500 records | ⚠️ Unmeasured — no load testing performed |
| NFR-PER-02 | Real-time collaboration updates propagate within 500 ms | ⚠️ Architecturally supported (Yjs deltas over WebSocket); unmeasured |
| NFR-PER-03 | Uploads stored on the server file system; API returns relative URL paths | ✅ |
| NFR-PER-04 | SignalR receive limit raised to 4 MB for large paste operations | ✅ |
| NFR-PER-05 | Grammar checking debounced at 2 s and capped at 20 000 characters | ✅ |
| NFR-PER-06 | Server-side pagination on large list endpoints | ⚠️ Pagination is largely client-side; list endpoints return full result sets |
| NFR-PER-07 | Response caching or output caching | ❌ |

### 3.3 Usability

| ID | Requirement | Status |
|---|---|:---:|
| NFR-USE-01 | Responsive UI down to 768 px | ✅ |
| NFR-USE-02 | Navy/gold design system with dark-mode parity | ✅ |
| NFR-USE-03 | Destructive actions require confirmation | ✅ |
| NFR-USE-04 | Toast feedback on every user-initiated action | ✅ |
| NFR-USE-05 | Descriptive empty states wherever no data exists | ✅ |
| NFR-USE-06 | Keyboard-accessible global search | ✅ |
| NFR-USE-07 | Loading spinners on all asynchronous operations | ✅ |
| NFR-USE-08 | Timezone correctness — all timestamps serialised as UTC with `Z`; Philippine Time helper server-side | ✅ |
| NFR-USE-09 | WCAG 2.1 AA conformance verified by audit | ⚠️ Palette designed for contrast; no formal audit, no systematic ARIA labelling or focus-trap review |
| NFR-USE-10 | Internationalisation / multi-language support | ❌ |

### 3.4 Maintainability

| ID | Requirement | Status |
|---|---|:---:|
| NFR-MAI-01 | Schema changes managed through EF Core code-first migrations | ✅ |
| NFR-MAI-02 | Business logic in interface-backed services; controllers stay thin | ✅ |
| NFR-MAI-03 | Enums serialised as string names (`JsonStringEnumConverter`) | ✅ |
| NFR-MAI-04 | AutoMapper convention mapping with targeted profile overrides | ✅ |
| NFR-MAI-05 | Swagger/OpenAPI documentation generated for the whole API surface | ✅ |
| NFR-MAI-06 | ESLint configured for the client | ✅ |
| NFR-MAI-07 | Single typed API service layer on the client (`services/api.js`) | ✅ |
| NFR-MAI-08 | Dependency licence hygiene (AutoMapper pinned to the last MIT release; QuestPDF Community) | ✅ |
| NFR-MAI-09 | **Automated test suite** (unit / integration / end-to-end) | ❌ No test project exists in the solution |
| NFR-MAI-10 | Continuous integration pipeline | ❌ |
| NFR-MAI-11 | Structured application logging / error telemetry | ⚠️ Default ASP.NET console logging only; no structured sink, no correlation IDs |
| NFR-MAI-12 | Global exception-handling middleware returning consistent error envelopes | ⚠️ Handled per-controller with try/catch; no central handler |

### 3.5 Reliability & Availability

| ID | Requirement | Status |
|---|---|:---:|
| NFR-AVA-01 | Target 99 % uptime during academic semesters | ⚠️ Target stated; no monitoring or SLA instrumentation in place |
| NFR-AVA-02 | Connection failures return structured errors; UI shows a friendly error state | ✅ |
| NFR-AVA-03 | Roles and default users seeded automatically on startup (`DbSeeder`) | ✅ |
| NFR-AVA-04 | Required upload directories created on startup | ✅ |
| NFR-AVA-05 | Manuscript CRDT state persisted server-side, surviving disconnects and restarts | ✅ |
| NFR-AVA-06 | Database backup and restore procedure | ❌ Not defined |
| NFR-AVA-07 | Health-check endpoint | ❌ |

### 3.6 Deployment & Portability

| ID | Requirement | Status |
|---|---|:---:|
| NFR-DEP-01 | Single-deployable SPA + API (fallback to `index.html`, static asset mapping) | ✅ |
| NFR-DEP-02 | SPA proxy configured for local development | ✅ |
| NFR-DEP-03 | Environment-specific configuration via `appsettings.{Environment}.json` | ✅ |
| NFR-DEP-04 | Containerisation (Dockerfile / compose) | ❌ |
| NFR-DEP-05 | Production hosting target selected and provisioned | ❌ |
| NFR-DEP-06 | Cloud object storage for uploads (Azure Blob / S3) | ❌ Local file system only |

---

## 4. Feature-to-Role Matrix

| Capability | SuperAdmin | Admin | Faculty (Adviser/FIC) | Faculty (Panel) | Student |
|---|:---:|:---:|:---:|:---:|:---:|
| Manage users / roles | ✓ | ✓ | — | — | — |
| Force password reset / email change / 2FA override | ✓ | — | — | — | — |
| Manage classrooms | ✓ | ✓ | ✓ (own) | — | — |
| Join classroom | — | — | — | — | ✓ |
| Create / manage groups | ✓ | ✓ | — | — | — |
| Assign adviser | ✓ | ✓ | — | — | — |
| Set group deadlines | ✓ | ✓ | ✓ | — | — |
| Set defense outcome | ✓ | ✓ | — | — | — |
| Submit chapters / documents | — | — | — | — | ✓ |
| Review chapters / documents | ✓ | ✓ | ✓ | — | — |
| Edit manuscript | — | — | — | — | ✓ |
| Comment on manuscript | ✓ | ✓ | ✓ | — | ✓ (read) |
| Open revision round | ✓ | ✓ | ✓ | — | — |
| Vote to finalize manuscript | — | — | — | — | ✓ |
| Schedule defenses | ✓ | ✓ | — | — | — |
| Manage rubric criteria | ✓ | ✓ | — | — | — |
| Toggle rating window | ✓ | ✓ | — | — | — |
| Submit defense ratings | — | — | — | ✓ | — |
| Create system features | ✓ | ✓ | ✓ | — | — |
| Update feature status | ✓ | ✓ | ✓ | — | In Progress only |
| Set feature urgency / Gantt dates | ✓ | ✓ | ✓ | — | — |
| Test features & upload screenshots | — | — | — | — | ✓ |
| Comment on features | ✓ | ✓ | ✓ | ✓ | ✓ |
| View monitoring dashboard | ✓ | ✓ | ✓ (own groups) | — | ✓ (own group) |
| Generate reports | ✓ | ✓ | ✓ (group progress) | — | — |
| Create consultation schedules | ✓ | ✓ | ✓ | — | — |
| Log consultations | — | — | ✓ | — | — |
| Request consultations | — | — | — | — | ✓ |

---

## 5. Key Enumerations

| Enum | Values |
|---|---|
| `UserRole` | SuperAdmin, Admin, Faculty, Student |
| `DefensePhase` | TitleDefense, ProposalDefense, FinalDefense, ReDefense |
| `DefenseStatus` | Scheduled, Rescheduled, Cancelled, Completed |
| `DefenseOutcome` | Pending, Defended, NotDefended |
| `RevisionLevel` | None, MinorRevisions, MajorRevisions |
| `FeatureUrgency` | Low, Medium, High, Critical |
| `FeatureType` | Functional, NonFunctional |
| `SystemFeatureStatus` | NotStarted, InProgress, Completed, NeedsRevision |
| `StudentTestStatus` | NotTested, Passed, Failed |
| `DocumentSubmissionStatus` | Draft, SubmittedForReview, NeedsRevision, Approved |
| `DocumentSection` | TitlePage, ApprovalSheet, Abstract, Acknowledgement, Dedication, TableOfContents, ListOfTables, ListOfFigures, Chapter1–5, References, Appendices |
| `ChapterStatus` | PendingReview, UnderRevision, Approved |
| `ConsultationMode` | InPerson, Online |
| `ConsultationScheduleStatus` | Open, Full, Closed, Cancelled |
| `ConsultationRequestStatus` | Pending, Approved, Rejected |
| `EnrollmentStatus` | Active, Invited |
| `GroupStatus` | Active, Completed, Archived |
| `NotificationType` | 20 values spanning chapter, document, consultation, defense, classroom, manuscript, deadline, and system-feature events |

---

## 6. Implementation Status Summary

### 6.1 Completion by Module

| Module | Implemented | Partial | Not Implemented | Assessment |
|---|:---:|:---:|:---:|---|
| Authentication & Accounts | 11 | 0 | 1 | Complete for the thesis scope |
| User Management | 8 | 0 | 2 | Complete for the thesis scope |
| Classroom Management | 9 | 1 | 1 | Near-complete |
| Group Management | 12 | 0 | 0 | **Complete** |
| Chapter Review | 8 | 0 | 0 | **Complete** |
| Document Review | 15 | 0 | 0 | **Complete** |
| Manuscript Collaboration | 12 | 2 | 1 | Near-complete |
| Consultations | 9 | 0 | 1 | Near-complete |
| Defense Scheduling | 11 | 0 | 1 | Near-complete |
| Rubric & Rating | 8 | 0 | 1 | Near-complete |
| System Feature Tracker | 18 | 0 | 1 | **Complete** |
| Monitoring | 7 | 0 | 1 | Near-complete |
| Reports | 5 | 1 | 1 | Functional |
| Notifications | 6 | 0 | 2 | Functional |
| Cross-Cutting UI | 6 | 0 | 0 | **Complete** |
| **Functional total** | **145** | **4** | **14** | **~89 % complete** |
| Security (NFR) | 15 | 3 | 4 | Strong, with defined gaps |
| Performance (NFR) | 3 | 3 | 1 | Unvalidated |
| Usability (NFR) | 8 | 1 | 1 | Strong |
| Maintainability (NFR) | 8 | 2 | 2 | Good architecture, no tests |
| Reliability (NFR) | 4 | 1 | 2 | Adequate for pilot |
| Deployment (NFR) | 3 | 0 | 3 | Development-stage only |
| **Non-functional total** | **41** | **10** | **13** | **~64 % complete** |

### 6.2 What Is Finished

The **entire academic workflow is operational end-to-end.** A student can register, verify their
email, join a classroom by code, be placed in a capstone group, draft chapters, upload documents for
review, co-author the manuscript in real time with live cursors and grammar checking, export it to
DOCX, request and attend consultations, track system features with screenshot evidence, and be
scheduled for and rated at a defense — while faculty review at every step and admins monitor and
report across the institution.

Specific strengths of the current build:

1. **Real-time collaborative editing is production-grade.** Yjs CRDT over a SignalR transport with
   server-persisted document state, presence awareness, and collaborative cursors — the hardest
   technical component of the system, and it is finished.
2. **Authorization is systematically enforced.** The recent `IGroupAccessChecker` sweep (commits
   `87c22fa` → `f130fd2`) replaced ad-hoc role checks with one canonical per-group access rule
   applied across every group-scoped endpoint.
3. **Upload handling is hardened.** Extension allowlist, magic-byte verification, `nosniff`, and a
   static-path block that forces every document through an access-checked download endpoint.
4. **Reporting is real.** Four distinct server-rendered PDF reports, not screen printouts.
5. **The System Feature Tracker is fully realised**, including the automatic system-comment audit
   trail, urgency colour-coding, student test evidence, and Gantt planning.

### 6.3 What Still Needs to Be Accomplished

**Priority 1 — Must resolve before deployment**

| # | Item | Reference | Rationale |
|:---:|---|---|---|
| 1 | **Move secrets out of `appsettings.json`** into user-secrets or environment variables, and rotate the exposed JWT key and SMTP app password | NFR-SEC-18 | A live Gmail app password and the token signing key are committed to the repository. Anyone with repo access can forge tokens for any role. |
| 2 | Add rate limiting to `/api/auth/*` and upload endpoints | NFR-SEC-19 | Identity lockout protects individual accounts but not against distributed enumeration or upload abuse. |
| 3 | Add security response headers (CSP, HSTS, X-Frame-Options, Referrer-Policy) | NFR-SEC-21 | Standard hardening; the app renders user-supplied HTML. |
| 4 | Configure production database, hosting target, and a backup procedure | NFR-DEP-05, NFR-AVA-06 | Connection string still points at LocalDB. |
| 5 | Commit or resolve the 41 files currently uncommitted in the working tree | — | The authorization work is not yet captured in history. |

**Priority 2 — Needed for a defensible thesis submission**

| # | Item | Reference | Rationale |
|:---:|---|---|---|
| 6 | **Automated test suite** — at minimum, unit tests for `GroupAccessChecker` and the service layer, plus integration tests over the auth and document workflows | NFR-MAI-09 | There are currently zero tests. This is the single largest documentation gap for a capstone defense. |
| 7 | Performance measurement against NFR-PER-01 and NFR-PER-02 | NFR-PER-01/02 | Both targets are asserted in the SRS but never measured; a defense panel will ask for evidence. |
| 8 | Extend audit logging beyond authentication to cover role changes, group mutations, defense outcomes, and document status changes; add an Admin audit viewer | NFR-SEC-17, FR-USER-10 | The `AuditLog` entity is built but almost entirely unused. |
| 9 | Global exception-handling middleware with a consistent error envelope | NFR-MAI-12 | Error shape currently varies per controller. |
| 10 | Accessibility audit against WCAG 2.1 AA | NFR-USE-09 | Claimed in the SRS; unverified. |

**Priority 3 — Feature completion**

| # | Item | Reference |
|:---:|---|---|
| 11 | Expose manuscript snapshot **restore** in the UI (persistence already exists) | FR-MAN-07 |
| 12 | Real-time notification push over SignalR, replacing fetch-time badge updates | FR-NOT-07 |
| 13 | Self-hosted or authenticated LanguageTool endpoint, with graceful degradation | FR-MAN-12 |
| 14 | Panelist and venue conflict detection in the defense scheduler | FR-DEF-12 |
| 15 | Remove-enrollment endpoint for classroom FICs | FR-CLASS-11 |
| 16 | Server-side pagination on the large list endpoints | NFR-PER-06 |
| 17 | Excel/CSV export for the server-generated reports | FR-REP-06 |
| 18 | Bulk user import from a CSV/Excel roster | FR-USER-09 |
| 19 | Health-check endpoint and structured logging sink | NFR-AVA-07, NFR-MAI-11 |

**Priority 4 — Post-thesis enhancements**

Cloud object storage for uploads (NFR-DEP-06) · containerised deployment (NFR-DEP-04) · CI pipeline
(NFR-MAI-10) · refresh-token rotation (FR-AUTH-12) · notification preferences (FR-NOT-08) ·
`.ics` calendar export (FR-CON-10) · reusable rubric templates (FR-RUB-09) · feature dependency
graph (FR-SFT-19) · historical trend analytics (FR-MON-08) · internationalisation (NFR-USE-10) ·
offline manuscript editing (FR-MAN-15).

---

## 7. System Constraints

- Intended for a single academic institution (PSU Lingayen); no multi-tenancy.
- Email delivery requires a configured SMTP provider; all account flows depend on it.
- Real-time collaboration requires WebSocket support on the hosting environment.
- Grammar checking requires outbound internet access to the LanguageTool public API.
- File storage is the local file system; horizontal scaling would require shared or cloud storage.
- QuestPDF runs under the Community licence; AutoMapper is pinned at 13.0.1, the last MIT-licensed
  release. Neither may be upgraded without a licence review.

---

## 8. Verification Method

Every status mark in this document was established by direct inspection of the source tree at commit
`f130fd2`, covering: 13 API controllers and their full route and `[Authorize]` surface; 15 service
implementations; 27 EF Core entity models; `Program.cs` startup configuration; the SignalR hub; 35
client route pages; 11 shared components; both client and server dependency manifests; and the
solution structure. Requirements marked ❌ were confirmed absent, not merely unlocated.

---

*Document maintained at `thesismatesystem.client/src/assets/SYSTEM_SPECIFICATIONS_STATUS.md`.*
*Supersedes `REQUIREMENTS_SPECIFICATION.md` v1.0 (2026-06-29).*
