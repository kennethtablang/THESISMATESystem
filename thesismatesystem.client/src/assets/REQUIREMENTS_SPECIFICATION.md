# ThesisMate System — Software Requirements Specification

**Version:** 1.0  
**Date:** 2026-06-29  
**Project:** ThesisMate — Thesis and Capstone Management System

---

## 1. Introduction

ThesisMate is a web-based platform designed to manage the complete lifecycle of undergraduate thesis and capstone projects. It supports multi-role collaboration among students, faculty advisers, panel members, and administrative staff from initial group formation through to final defense and outcome recording.

**Technology Stack**
- Frontend: React 18 + Vite, Tailwind CSS
- Backend: ASP.NET Core 8 Web API, Entity Framework Core
- Database: SQL Server
- Real-time: SignalR

---

## 2. User Roles

| Role | Description |
|---|---|
| **SuperAdmin** | Platform owner. Full system access including user promotion and global settings. |
| **Admin** | Department coordinator. Manages classrooms, groups, defense scheduling, and evaluation controls. |
| **Faculty** | Unified role for all faculty members. Acts as Adviser, Faculty-in-Charge (FIC), or Panel member based on assignment context. |
| **Student** | Enrolled thesis/capstone student. Member of a capstone group. |

---

## 3. Functional Requirements

### 3.1 Authentication & Account Management

**FR-AUTH-01** Users must register with a full name, email, and password.  
**FR-AUTH-02** The system shall send a verification email upon registration; the account is inactive until verified.  
**FR-AUTH-03** Users must log in with email and password.  
**FR-AUTH-04** Two-factor authentication (2FA) via email OTP shall be supported as an optional security layer.  
**FR-AUTH-05** Users may request a password reset via an emailed reset link.  
**FR-AUTH-06** JWT access tokens shall be issued on successful login and validated on every protected request.  
**FR-AUTH-07** Each user has a profile page where they can update their name, bio, contact number, and profile photo.  
**FR-AUTH-08** The system shall enforce role-based access control (RBAC) on all API endpoints.

---

### 3.2 User Management (Admin / SuperAdmin)

**FR-USER-01** Admins may view a paginated, searchable list of all registered users.  
**FR-USER-02** Admins may promote or demote a user's role (Student ↔ Faculty ↔ Admin).  
**FR-USER-03** SuperAdmins may promote users to Admin.  
**FR-USER-04** Admins may deactivate or reactivate user accounts.  
**FR-USER-05** The Advisers page shows Faculty members available for adviser assignment, filterable by name.

---

### 3.3 Classroom Management

**FR-CLASS-01** A Faculty (FIC) may create a classroom with a name, academic year, and description.  
**FR-CLASS-02** The system generates a unique join code per classroom.  
**FR-CLASS-03** Faculty may invite students by email or students may join using the join code.  
**FR-CLASS-04** Faculty may post announcements within a classroom; enrolled students receive in-app notifications.  
**FR-CLASS-05** Faculty may view all enrolled students and remove enrollments.  
**FR-CLASS-06** Admins may view and manage all classrooms across the institution.  
**FR-CLASS-07** A classroom may have a logo/banner image uploaded by the FIC.

---

### 3.4 Capstone Group Management

**FR-GROUP-01** Admins may create capstone groups, assigning a group name, academic year, section, and adviser.  
**FR-GROUP-02** Admins may add or remove student members from a group.  
**FR-GROUP-03** Each group has a status: Active, Completed, or Archived.  
**FR-GROUP-04** Admins may assign a Faculty member as the group's adviser.  
**FR-GROUP-05** Each group may have a custom logo uploaded by the adviser.  
**FR-GROUP-06** A group detail page shows members, chapters, documents, system features, and deadlines.  
**FR-GROUP-07** Admins may set group-level deadlines for milestones (e.g., chapter submissions).  
**FR-GROUP-08** After a completed Final Defense or Re-Defense, Admins may set the group's defense outcome:
  - Defense Result: Defended or Not Defended
  - Revision Level: No Revisions, Minor Revisions, or Major Revisions
  - Flag: Requires Re-Defense (boolean)

---

### 3.5 Chapter Submission & Review

**FR-CHAP-01** Students may submit individual thesis chapters (Ch.1–5 plus front matter) for adviser review.  
**FR-CHAP-02** Each chapter submission has a status: Pending Review, Under Revision, or Approved.  
**FR-CHAP-03** Advisers may approve a chapter or request revisions with written notes.  
**FR-CHAP-04** Revision notes are stored per chapter; students receive a notification when a note is added.  
**FR-CHAP-05** Advisers may view the full history of submission versions per chapter.  
**FR-CHAP-06** The chapter view shows all sections with their current approval status.

---

### 3.6 Document Submission & Review

**FR-DOC-01** Students may upload document files (PDF/Word) per defined section (Title Page, Abstract, Chapter 1–5, References, Appendices, etc.).  
**FR-DOC-02** Documents have statuses: Draft, Submitted for Review, Needs Revision, Approved.  
**FR-DOC-03** Students may submit a drafted document to the adviser for review.  
**FR-DOC-04** Advisers may approve a document or request revisions.  
**FR-DOC-05** When the adviser approves a document, the system automatically posts a comment: "This document has been approved."  
**FR-DOC-06** When the adviser requests revision, the system automatically posts a comment: "This document has been sent back for further revisions."  
**FR-DOC-07** Users may add manual comments on any document; all commenters receive notifications.  
**FR-DOC-08** Students may compare two document versions side-by-side (Document Compare view).  
**FR-DOC-09** Advisers navigate through multiple submitted documents using next/previous pagination without duplication.

---

### 3.7 Manuscript Collaboration Editor

**FR-MAN-01** Each group has a shared manuscript workspace divided into sections (matching document sections).  
**FR-MAN-02** Any group member or the adviser may edit manuscript sections in real time via SignalR.  
**FR-MAN-03** Section-level comments allow threaded discussion between student and adviser.  
**FR-MAN-04** The adviser may leave inline revision notes on specific manuscript sections.  
**FR-MAN-05** The system saves timestamped snapshots (versions) of the manuscript; any snapshot may be restored.  
**FR-MAN-06** Members may vote to finalize a manuscript; finalization is confirmed when all required votes are cast.  
**FR-MAN-07** A SignalR hub broadcasts section changes to all connected collaborators in real time.

---

### 3.8 Consultation Management

**FR-CON-01** Faculty may create consultation schedules with date, time, mode (In-Person / Online), and slot capacity.  
**FR-CON-02** Students may browse available consultation slots and submit a request.  
**FR-CON-03** The Faculty may approve or reject a consultation request; the student receives a notification.  
**FR-CON-04** Faculty may log consultation records (notes, date, duration, attendees) for each group.  
**FR-CON-05** Students may view a consultation calendar showing approved consultations and their details.  
**FR-CON-06** Consultation history is accessible per group for monitoring and reporting.

---

### 3.9 Defense Scheduling

**FR-DEF-01** Admins and Faculty may schedule defense events by dragging a group tile onto a calendar (FullCalendar drag-and-drop).  
**FR-DEF-02** Each defense event records: group, phase, date/time, venue, duration, and assigned panelists.  
**FR-DEF-03** Defense phases: Title Defense, Proposal Defense, Final Defense, Re-Defense.  
**FR-DEF-04** Defense statuses: Scheduled, Rescheduled, Cancelled, Completed.  
**FR-DEF-05** Admins may edit a scheduled defense (date, venue, duration, panelists).  
**FR-DEF-06** Admins may cancel a scheduled defense; all panelists and the group are notified.  
**FR-DEF-07** Panel members are assigned per defense event from the Faculty roster.  
**FR-DEF-08** Faculty may view defense events assigned to them on the same calendar.  
**FR-DEF-09** After a Final Defense or Re-Defense is marked Completed, Admins may set the group outcome (see FR-GROUP-08).

---

### 3.10 Defense Rubric & Rating

**FR-RUB-01** Admins may create, edit, and delete rubric criteria per defense phase (Title, Proposal, Final, Re-Defense).  
**FR-RUB-02** Each criterion has a name, description, weight (%), and maximum score.  
**FR-RUB-03** Admins may toggle whether the rating/evaluation form is open for a specific defense event.  
**FR-RUB-04** When rating is open, assigned panelists may score each criterion for the group.  
**FR-RUB-05** The system calculates a weighted score per criterion and a consolidated total per panelist.  
**FR-RUB-06** A consolidated panel rating view shows per-criterion averages and the overall group score.  
**FR-RUB-07** Panelists may add qualitative comments alongside their scores.

---

### 3.11 System Feature Tracker (Requirements Tracker)

**FR-SFT-01** Faculty (Adviser) and Admins may create system requirement features within a group's tracker.  
**FR-SFT-02** Features are categorized as Functional or Non-Functional.  
**FR-SFT-03** Each feature has a status: Not Started, In Progress, Completed, Needs Revision.  
**FR-SFT-04** Advisers and Admins may update a feature's status.  
**FR-SFT-05** Students may mark a feature as "In Progress" (restricted to that status only).  
**FR-SFT-06** When any user changes a feature's status, the system automatically posts a system comment recording the actor and new status (e.g., "Adviser marked this feature as Approved.").  
**FR-SFT-07** Each feature has an urgency level: Low (green), Medium (yellow), High (orange), Critical (red).  
**FR-SFT-08** Urgency is color-coded and displayed as a badge on every feature card.  
**FR-SFT-09** Students may submit a test result per feature: Working (Passed) or Not Working (Failed), with an optional note.  
**FR-SFT-10** When a student submits a test result, the system automatically posts a system comment (e.g., "Juan dela Cruz tagged this feature as Working.").  
**FR-SFT-11** Students may upload screenshots as evidence for a feature's test result.  
**FR-SFT-12** Features support threaded comments from group members, the adviser, and assigned panel members.  
**FR-SFT-13** System-generated comments are marked with a bot icon and cannot be deleted.  
**FR-SFT-14** Panel members (Faculty assigned to a defense for this group) may read features and post comments for recommendations or solutions; they may not change status or urgency.  
**FR-SFT-15** Features support Gantt chart date planning (planned/actual start and end dates) accessible to the adviser.  
**FR-SFT-16** Admins may view the System Feature Tracker for any group.  
**FR-SFT-17** The tracker sidebar lists all groups; a "Panel" badge appears on groups where the Faculty user is an assigned panelist.

---

### 3.12 Monitoring Dashboard

**FR-MON-01** Admins and SuperAdmins may view an institution-wide monitoring dashboard.  
**FR-MON-02** The dashboard shows aggregate statistics: total groups, active groups, total students, chapter approval rates, defense counts per phase.  
**FR-MON-03** Per-group progress cards show chapter completion percentage, defense status, and document status.  
**FR-MON-04** Filters allow narrowing by academic year and group status.

---

### 3.13 Reports

**FR-REP-01** Admins may generate progress reports per group or across all groups.  
**FR-REP-02** Reports include chapter statuses, document statuses, consultation count, and defense history.  
**FR-REP-03** Reports may be exported (PDF or printable view).

---

### 3.14 Notifications

**FR-NOT-01** The system sends in-app notifications for the following events:
  - Chapter submitted / status updated / revision note added
  - Document uploaded / submitted / status updated / commented
  - Consultation logged / requested / request responded
  - Defense scheduled / rescheduled / cancelled / rating submitted
  - Classroom announcement / invitation
  - Manuscript updated
  - Deadline posted
  - System feature commented / status updated
**FR-NOT-02** Unread notifications are indicated by a badge count in the top navigation bar.  
**FR-NOT-03** Users may mark all notifications as read from the notifications page.  
**FR-NOT-04** Each notification links to the relevant resource (chapter, document, defense, feature).

---

## 4. Non-Functional Requirements

### 4.1 Security

**NFR-SEC-01** All API routes require a valid JWT bearer token except login, register, verify-email, and reset-password.  
**NFR-SEC-02** Passwords are hashed using ASP.NET Core Identity's BCrypt-based hasher; plaintext passwords are never stored.  
**NFR-SEC-03** Role-based authorization is enforced at the API controller level; client-side role guards are supplementary.  
**NFR-SEC-04** File uploads are validated for type and size server-side; only allowed image/document extensions are accepted.  
**NFR-SEC-05** System-generated comments are immutable; the delete API returns 403 Forbidden if `IsSystemComment = true`.

### 4.2 Performance

**NFR-PER-01** All list endpoints shall respond within 2 seconds under normal load for datasets up to 500 records.  
**NFR-PER-02** Real-time collaboration updates via SignalR shall propagate to connected clients within 500 ms.  
**NFR-PER-03** File uploads (documents, screenshots, logos) shall be stored on the server file system; API responses return relative URL paths.

### 4.3 Usability

**NFR-USE-01** The UI shall be fully responsive down to 768px screen width.  
**NFR-USE-02** The design system uses a navy/gold color palette; all interactive elements meet WCAG AA contrast ratios.  
**NFR-USE-03** All destructive actions (cancel defense, delete feature) require a confirmation step before execution.  
**NFR-USE-04** Toast notifications confirm success or failure of all user-initiated actions.  
**NFR-USE-05** Empty state components with descriptive messages are shown wherever no data is available.

### 4.4 Maintainability

**NFR-MAI-01** All database schema changes are managed through EF Core code-first migrations.  
**NFR-MAI-02** Business logic resides in service classes implementing interfaces; controllers are thin.  
**NFR-MAI-03** Enum values are serialized as string names in all API responses (`JsonStringEnumConverter`).  
**NFR-MAI-04** AutoMapper convention mapping is used for DTO projection; profile overrides are only added for non-obvious mappings.

### 4.5 Availability

**NFR-AVA-01** The system targets 99% uptime during academic semesters.  
**NFR-AVA-02** Database connection failures shall return structured error responses; the frontend shall display a user-friendly error state.

---

## 5. System Constraints

- The platform is intended for use within a single academic institution.
- Email delivery (verification, reset, notifications) requires a configured SMTP provider.
- Real-time collaboration requires WebSocket support on the hosting environment.
- File storage is local file system; cloud storage (Azure Blob, S3) is a future upgrade path.

---

## 6. Feature-to-Role Matrix

| Feature | SuperAdmin | Admin | Faculty (Adviser) | Faculty (Panel) | Student |
|---|:---:|:---:|:---:|:---:|:---:|
| Manage users / roles | ✓ | ✓ | — | — | — |
| Manage classrooms | — | ✓ | ✓ (own) | — | — |
| Join classroom | — | — | — | — | ✓ |
| Create/manage groups | — | ✓ | — | — | — |
| Set group adviser | — | ✓ | — | — | — |
| Set group defense outcome | — | ✓ | — | — | — |
| Submit chapters/documents | — | — | — | — | ✓ |
| Review chapters/documents | — | — | ✓ | — | — |
| Edit manuscript | — | — | ✓ | — | ✓ |
| Schedule defenses | — | ✓ | ✓ | — | — |
| Manage rubric criteria | — | ✓ | — | — | — |
| Submit defense ratings | — | — | — | ✓ | — |
| Create system features | — | ✓ | ✓ | — | — |
| Update feature status | — | ✓ | ✓ | — | In Progress only |
| Set feature urgency | — | ✓ | ✓ | — | — |
| Test & screenshot features | — | — | — | — | ✓ |
| Comment on features | — | ✓ | ✓ | ✓ (read + comment) | ✓ |
| View monitoring dashboard | ✓ | ✓ | — | — | — |
| Generate reports | ✓ | ✓ | — | — | — |
| Log consultations | — | — | ✓ | — | — |
| Request consultations | — | — | — | — | ✓ |

---

## 7. Key Enumerations

| Enum | Values |
|---|---|
| `DefensePhase` | TitleDefense, ProposalDefense, FinalDefense, ReDefense |
| `DefenseStatus` | Scheduled, Rescheduled, Cancelled, Completed |
| `DefenseOutcome` | Pending, Defended, NotDefended |
| `RevisionLevel` | None, MinorRevisions, MajorRevisions |
| `FeatureUrgency` | Low, Medium, High, Critical |
| `SystemFeatureStatus` | NotStarted, InProgress, Completed, NeedsRevision |
| `StudentTestStatus` | NotTested, Passed, Failed |
| `DocumentSubmissionStatus` | Draft, SubmittedForReview, NeedsRevision, Approved |
| `ChapterStatus` | PendingReview, UnderRevision, Approved |
| `ConsultationRequestStatus` | Pending, Approved, Rejected |
| `GroupStatus` | Active, Completed, Archived |
| `FeatureType` | Functional, NonFunctional |
