# ThesisMate — Software Requirements Specification (SRS)

**System:** ThesisMate — Progress Monitoring and Defense Rating System for Capstone Projects of BSIT Students
**Institution:** Pangasinan State University – Lingayen Campus, Science and Technology Department
**Technology Stack:** ASP.NET Core 10 Web API · React 19 + Vite · Entity Framework Core · Microsoft SQL Server · Tailwind CSS 3 · SignalR · Yjs · QuestPDF · JWT Bearer Authentication · docx (client-side DOCX generation) · LanguageTool API · DOMPurify
**Document Version:** 3.0 (added document section workflow, adviser review, manuscript auto-save, grammar/spell checking, comment highlight removal, formatted DOCX export, dashboard layout updates)
**Last Updated:** June 2026

---

## 1. System Overview

ThesisMate is a web-based, role-differentiated platform that consolidates capstone project **progress monitoring**, **manuscript collaboration**, and **oral defense rating** into a single, database-backed system. It replaces the manual, paper- and spreadsheet-based workflows currently used by faculty members and student researchers at PSU Lingayen by centralizing chapter submissions, real-time collaborative manuscript editing, consultation records, defense scheduling, evaluation scoring, classroom management, document review workflows, and academic reporting.

The architecture is a **decoupled SPA + REST API**: a React 19/Vite single-page application communicates with an ASP.NET Core 10 Web API via JSON over HTTPS, with JWT Bearer tokens for stateless authentication. Real-time features (manuscript collaboration, notifications) are delivered via SignalR WebSockets.

---

## 2. User Roles (Actors)

| Role | Description | Assigned By |
|---|---|---|
| **SuperAdmin** | Platform owner with full administrative authority, including user account management (force password reset, email change, 2FA toggle), and system-wide oversight. | Seeded / self-assigned |
| **Admin** | Department administrator managing groups, classrooms, defense schedules, evaluation activation, and report generation. | SuperAdmin |
| **Faculty** | A unified faculty role that can simultaneously be assigned as a Group Adviser, a Defense Panelist, and/or a Classroom Instructor-in-Charge (FacultyIC) across different groups and defenses. Capabilities are determined by database assignment, not sub-role. | Admin / SuperAdmin |
| **Student** | Member of a registered BSIT capstone group who submits chapters, uploads documents, edits the collaborative manuscript, and tracks progress. | Admin / joins via classroom code |

> **Note on Faculty Assignment:** A single Faculty user can be:
> - **Adviser** of a capstone group (via `CapstoneGroup.AdviserId`)
> - **Panelist** on one or more defense schedules (via `PanelAssignment`)
> - **Instructor-in-Charge** of a classroom (via `Classroom.FacultyICId`)
>
> These assignments are independent and concurrent. A Faculty assigned as adviser to Group A may simultaneously be a panelist for Group B's defense.

---

## 3. Core System Modules

| # | Module | Summary |
|---|---|---|
| 1 | User Authentication & Access Control | JWT-based login, email verification, 2FA, audit logging, RBAC |
| 2 | User & Role Management | Account creation, role assignment, Faculty assignment management |
| 3 | Capstone Group Management | Group registration, adviser assignment, logos, academic year, version tags |
| 4 | Classroom Management | Classroom creation, join-code enrollment, announcements, group assignment |
| 5 | Chapter Submission & Review | Chapter file uploads, status tracking, revision notes, version history |
| 6 | Document Management | Section-tagged document uploads, submission status workflow, versioning, adviser review with rich comments, approval/revision actions |
| 7 | Manuscript Collaborative Editor | Real-time multi-user editing (Yjs + SignalR), auto-save, grammar/spell checking, section management, revision workflow, inline comments with highlight removal, formatted DOCX export |
| 8 | System Feature Tracker | Track IT system/software features, completion dates, and commentary |
| 9 | Consultation Logging | Adviser-logged consultation records per group and chapter |
| 10 | Consultation Schedule Management | FacultyIC creates time slots; groups request and confirm appointments |
| 11 | Defense Scheduling & Panel Assignment | Admin schedules defenses, assigns Faculty panelists |
| 12 | Defense Rating & Evaluation | Admin-controlled evaluation window, weighted scoring, panelist ratings, finalization |
| 13 | Progress Monitoring Dashboard | Group health scores, risk-level indicators, milestone and consultation metrics |
| 14 | Notification System | Real-time in-app notifications per event type |
| 15 | Role-Specific Dashboards | Personalized at-a-glance views for each role |
| 16 | Report Generation | PDF export: group progress, milestone completion, defense outcome, all-groups summary |

---

## 4. Functional Requirements (FR)

### 4.1 User Authentication and Access Control

| ID | Requirement |
|---|---|
| FR-1.1 | The system shall allow users to register with a full name, institutional email, and password. The email address shall be unique per account. |
| FR-1.2 | The system shall send a verification email with a tokenized confirmation link upon registration. Accounts shall remain inactive until the email is verified. |
| FR-1.3 | The system shall authenticate users via email and password. On success, the system shall issue a signed JWT Bearer token containing the user's ID, role, full name, email, and 2FA status. |
| FR-1.4 | The system shall enforce Role-Based Access Control (RBAC) at every API endpoint using JWT claims, preventing unauthorized access even via direct HTTP requests. |
| FR-1.5 | The system shall provide a password reset flow: the user requests a reset link via email; the link contains a time-limited, single-use token; the user sets a new password through the link. |
| FR-1.6 | The system shall support opt-in **Two-Factor Authentication (2FA)** via email-based verification codes. When enabled, login requires a valid 6-digit code sent to the registered email after successful password verification. |
| FR-1.7 | The system shall allow **SuperAdmin** to manage any user account: force-set a new password, change the registered email address, enable or disable 2FA, and deactivate accounts. |
| FR-1.8 | The system shall allow **Admin and SuperAdmin** to change any user's role assignment, subject to validation that at least one SuperAdmin account always remains active. |
| FR-1.9 | The system shall record an audit log for all security-sensitive actions, including: login attempts (success/failure), role changes, account deactivation, and password or email overrides. Each entry shall record the acting user, target user, action type, and timestamp. |
| FR-1.10 | The system shall allow authenticated users to update their own profile (first name, middle name, last name, phone number), change their own password, and enable/disable their own 2FA. |

### 4.2 User and Role Management

| ID | Requirement |
|---|---|
| FR-2.1 | The system shall allow Admin and SuperAdmin to view a paginated, searchable list of all registered user accounts with name, email, role, active status, and registration date. |
| FR-2.2 | The system shall allow Admin and SuperAdmin to edit a user's name, role, and active status. SuperAdmin additionally may change the user's email and reset the password directly. |
| FR-2.3 | The system shall enforce that the `Faculty` role is the only valid faculty-type role. Roles `Adviser`, `FacultyIC`, and `Panel` are not valid in the current system and shall be rejected by the role validation logic. |
| FR-2.4 | The system shall provide an endpoint for Admin to retrieve all users filtered by role, enabling assignment interfaces (e.g., selecting Faculty users as advisers or panelists). |

### 4.3 Capstone Group Management

| ID | Requirement |
|---|---|
| FR-3.1 | The system shall allow Admin and SuperAdmin to create a capstone group, specifying: group name, research project title, assigned Faculty adviser, academic year, and initial member list. |
| FR-3.2 | The system shall enforce that exactly one Faculty user is assigned as the adviser of a capstone group. |
| FR-3.3 | The system shall allow Admin and SuperAdmin to edit group details: name, project title, adviser assignment, and academic year. |
| FR-3.4 | The system shall allow Admin and SuperAdmin to archive (soft-delete) a capstone group. Archived groups shall be excluded from active listings but remain accessible for historical reporting. |
| FR-3.5 | The system shall allow students and Admin to upload a group logo image (JPEG, PNG, GIF, WebP). The logo shall be stored server-side and served via a public endpoint. |
| FR-3.6 | The system shall allow students to update their group's software version tag (manuscript version and system version) for tracking development milestones. |
| FR-3.7 | The system shall allow Faculty advisers to retrieve only the capstone groups for which they are assigned as adviser. Admin and SuperAdmin can retrieve all groups. |
| FR-3.8 | The system shall allow any authenticated user to retrieve a specific group's details by ID. Students may retrieve only the group they belong to. |

### 4.4 Classroom Management

| ID | Requirement |
|---|---|
| FR-4.1 | The system shall allow Faculty users (in their Instructor-in-Charge capacity) and Admin to create a classroom, specifying a name and academic year. |
| FR-4.2 | Upon classroom creation, the system shall automatically generate a unique, human-readable join code using an unambiguous character set (excluding easily confused characters such as 0, O, I, 1). |
| FR-4.3 | The system shall allow the classroom owner (FacultyIC) to regenerate the join code at any time, invalidating the previous code. |
| FR-4.4 | The system shall allow students to join a classroom by entering a valid join code. A student may belong to only one active classroom at a time. |
| FR-4.5 | The system shall allow the classroom's FacultyIC and Admin to view the full enrollment list for a classroom, including enrolled students and their group assignments. |
| FR-4.6 | The system shall allow the FacultyIC and Admin to post announcements to a classroom. Announcements may optionally be targeted to a specific capstone group within the classroom. |
| FR-4.7 | The system shall display all relevant announcements to a student based on their classroom enrollment and group membership. |
| FR-4.8 | The system shall allow the FacultyIC and Admin to assign a subset of enrolled students to a specific capstone group within the classroom. |
| FR-4.9 | The system shall allow a FacultyIC to retrieve the classrooms they own. |

### 4.5 Chapter Submission and Review

| ID | Requirement |
|---|---|
| FR-5.1 | The system shall allow students to upload chapter submissions (Chapters 1–5) as file attachments (PDF, DOCX, and other document formats). Each submission shall be linked to the student's active capstone group. |
| FR-5.2 | The system shall automatically timestamp every chapter submission with the Philippine Standard Time of upload. |
| FR-5.3 | The system shall store all versions of a chapter submission, maintaining a complete revision history accessible by the group and reviewer. |
| FR-5.4 | The system shall allow Faculty advisers and Admin to view and download any chapter submission for a group they are assigned to or have authority over. |
| FR-5.5 | The system shall allow Faculty advisers and Admin to update the review status of a chapter submission. Valid statuses are: `PendingReview`, `UnderRevision`, `Approved`. |
| FR-5.6 | The system shall allow Faculty advisers and Admin to attach written revision notes to a specific chapter submission. Notes shall be timestamped and associated with the reviewing faculty member. |
| FR-5.7 | The system shall notify the capstone group (all members) when the adviser updates a chapter's status or adds revision notes. |
| FR-5.8 | The system shall notify the assigned adviser when a student group submits or resubmits a chapter. |
| FR-5.9 | The system shall allow authenticated users to download a chapter submission file via a secure endpoint. |

### 4.6 Document Management

| ID | Requirement |
|---|---|
| FR-6.1 | The system shall allow students to upload general project documents (e.g., signed forms, certificates, requirements) associated with their capstone group. |
| FR-6.2 | The system shall allow students to upload a new version of an existing document, preserving the version history. |
| FR-6.3 | The system shall allow authenticated users to retrieve the full version history of any document. |
| FR-6.4 | The system shall allow Faculty advisers and Admin to retrieve documents submitted by their advisee groups. Admin and SuperAdmin may retrieve all documents. |
| FR-6.5 | The system shall allow students, Faculty advisers, and Admin to add text comments to a document submission. |
| FR-6.6 | The system shall allow the uploading student and Admin to delete a document. |
| FR-6.7 | The system shall allow authenticated users to download any document via a secure endpoint. |
| FR-6.8 | The system shall tag each document submission with one of the following enumerated section types: `TitlePage`, `Abstract`, `Chapter1`, `Chapter2`, `Chapter3`, `Chapter4`, `Chapter5`, `RelatedLiterature`, `Methodology`, `Results`, `Conclusion`, `References`, `Appendices`. Untagged documents shall be valid and treated as general uploads. |
| FR-6.9 | Each document submission shall carry a `DocumentSubmissionStatus` field with one of the following values: `Draft` (default upon upload), `SubmittedForReview`, `NeedsRevision`, `Approved`. The system shall enforce valid state transitions and reject invalid ones. |
| FR-6.10 | The system shall allow a student member of the owning capstone group to submit a document for adviser review by transitioning its status from `Draft` or `NeedsRevision` to `SubmittedForReview` via `POST /documents/{id}/submit`. |
| FR-6.11 | The system shall allow the group's assigned Faculty adviser (and Admin) to update a document's submission status to `Approved` or `NeedsRevision` via `PATCH /documents/{id}/status`. Unauthorized callers (e.g., a Faculty user who is not the group's adviser) shall receive a `403 Forbidden` response. |
| FR-6.12 | The system shall send a `DocumentSubmitted` notification to the group's assigned adviser when a student submits a document for review (FR-6.10). The notification message shall include the group name, document title, and version number. |
| FR-6.13 | The system shall send a `DocumentStatusUpdated` notification to all members of the capstone group when the adviser updates the document's status (FR-6.11). The notification message shall include the document title and the new status. |
| FR-6.14 | The system shall provide an **Adviser Document Review page** accessible to Faculty advisers at the route `/documents/review/:id`. The page shall present a split-screen layout: a left document preview pane (rendering DOCX files using `docx-preview` and PDF files via an iframe) and a right sidebar. The sidebar shall display: section label, version indicator (e.g., "v2 of 3"), group name, submitter name, submission date, current status badge, a download button, and — when the document's status is `SubmittedForReview` — `Approve` and `Request Revision` action buttons. |
| FR-6.15 | The Adviser Document Review page shall provide a rich-text comment editor within the right sidebar, supporting Bold, Italic, Underline, text highlight, and a color palette. The system shall allow the adviser to submit comments associated with the document. All submitted comment content shall be sanitized using DOMPurify before rendering in the browser to prevent cross-site scripting. |
| FR-6.16 | The system shall provide an **Adviser Document Review list page** (`/adviser/manuscript-review`) displaying all documents across all groups the Faculty user advises, ordered first by canonical section sequence (TitlePage first, Appendices last), then by status (`SubmittedForReview` first), then by submission date. The page shall provide status filter tabs (All / Pending Review / Approved / Needs Revision) and a group filter dropdown. Documents with `SubmittedForReview` status shall display a "Review Now" button; all other statuses shall display a "View & Comment" button. |
| FR-6.17 | The system shall provide a **Student Upload Documents page** (`/documents`) listing one card per recognized document section. Each card shall display the uploaded file name, version number, and the current `DocumentSubmissionStatus` as a color-coded badge. When a document has `Draft` or `NeedsRevision` status, the card shall display a right-aligned "Finalize & Submit to Adviser" button that triggers the FR-6.10 workflow. The "Upload New Version" action shall remain available for all uploaded sections regardless of status. |

### 4.7 Manuscript Collaborative Editor

| ID | Requirement |
|---|---|
| FR-7.1 | The system shall provide a real-time collaborative manuscript editor supporting concurrent multi-user editing of the capstone manuscript via Yjs CRDT (Conflict-free Replicated Data Type) over a SignalR WebSocket hub. |
| FR-7.2 | The system shall organize the manuscript into the following fixed sections: Chapter 1, Chapter 2, Chapter 3, Chapter 4, Chapter 5, and References. |
| FR-7.3 | The system shall persist the current HTML content and Yjs binary state of each section to the database upon every save operation. The system shall record which student last saved each section and the timestamp of that save. |
| FR-7.4 | The system shall track word count per manuscript section and update it on every save. |
| FR-7.5 | The system shall allow students to upload inline images to the manuscript editor. Image files shall be validated by magic-byte signature against an allowlist of permitted extensions (JPEG, PNG, GIF, WebP, BMP). |
| FR-7.6 | The system shall implement a **manuscript locking/voting mechanism**: all group members must individually cast a vote to lock the current revision. Once all members have voted, the manuscript revision is locked and becomes read-only for students. |
| FR-7.7 | The system shall allow a student to revoke their lock vote before the revision is fully locked. |
| FR-7.8 | The system shall allow Faculty advisers, FacultyIC, and Admin to **open a new revision** of a manuscript, incrementing the revision number and unlocking it for student editing. |
| FR-7.9 | The system shall allow Faculty advisers, FacultyIC, and Admin to add section-level review comments to any manuscript section. Comments shall be associated with a specific section key and revision number. |
| FR-7.10 | The system shall allow authenticated users to retrieve comments filtered by section key and/or revision number. |
| FR-7.11 | The system shall provide a **revision summary** for a group's manuscript, showing: the current revision number, locked status, per-section review completion, and a history of all past revisions with comment counts and timestamps. |
| FR-7.12 | The system shall authorize SignalR manuscript hub access per-group using the user's JWT and their assignment (student in group, Faculty adviser/panel/FacultyIC for that group, Admin). Unauthorized connections shall be rejected. |
| FR-7.13 | The system shall allow Faculty advisers, panelists, FacultyIC, and Admin to view the manuscript of any group they are authorized for (via assignment checks). |
| FR-7.14 | The system shall implement **auto-save** in the manuscript editor. Content changes shall trigger a 2-second debounce timer; upon expiry, the editor shall automatically save the current HTML content and Yjs binary state to the server using the same payload as a manual save. Each content change resets the debounce timer. Auto-save shall be suppressed for locked (read-only) sections. |
| FR-7.15 | The system shall display a **save status indicator** in the manuscript editor's status bar reflecting the current save state: (a) a spinning ring with the label "Saving…" while a save request is in flight; (b) a green checkmark with the label "All changes saved" for three seconds immediately following a successful save; (c) the timestamp of the last save in Philippine Standard Time and the name of the saving user in the idle state; and (d) "Not yet saved" if the section has never been saved. Pressing Ctrl+S or Cmd+S shall cancel any pending auto-save timer and trigger an immediate save. |
| FR-7.16 | The system shall provide **real-time grammar and spelling checking** within the manuscript editor using the LanguageTool public API. After a 2-second debounce following each content change, the editor shall submit up to 20,000 characters of plain text (extracted from the ProseMirror document, with block boundaries represented as paragraph separators) to the LanguageTool endpoint. The system shall render identified errors as inline ProseMirror decorations: a red wavy underline for spelling errors (`misspelling` issue type) and a blue wavy underline for grammar errors. Hovering over an underlined segment shall display a tooltip containing the error message and up to five suggested corrections. Grammar checking shall not fire on locked sections. Network errors and API rate-limit responses shall be silently ignored. The browser's native `spellcheck` attribute shall be disabled on the editor's contenteditable element to prevent duplicate underlines. |
| FR-7.17 | When a user deletes an inline comment from the comment panel in the manuscript editor, the system shall simultaneously remove the corresponding text highlight (ProseMirror `comment` mark) from the document. The removal shall be performed via a ProseMirror transaction that traverses all text nodes in the document, identifies those carrying a `comment` mark whose `commentId` attribute matches the deleted comment, and calls `removeMark` on each such node range before dispatching the transaction. |
| FR-7.18 | The system shall allow students to **finalize** a manuscript section (Chapter 1–5 or References) to the Document Management system. The finalization process shall: (a) generate a DOCX file entirely in the browser using the `docx` npm library, applying academic formatting (Courier New 12pt font, double line spacing, 1.5-inch left margin, 1-inch top/right/bottom margins, centered page-number footer); (b) upload the generated DOCX file to the server via `POST /documents/groups/{groupId}/sections/{sectionKey}/finalize` as multipart form data; and (c) on the server, store the uploaded file directly to disk and create a new `DocumentSubmission` record (or a new version of an existing record for that section), without performing any server-side HTML-to-DOCX conversion. The same client-side formatting shall be applied when a user selects "Export This Section" to download the DOCX locally without uploading. |

### 4.8 System Feature Tracker

| ID | Requirement |
|---|---|
| FR-8.1 | The system shall allow Faculty advisers and Admin to create system feature records for a capstone group, specifying: feature name, description, planned start date, planned end date, and actual completion date. |
| FR-8.2 | The system shall allow Faculty advisers and Admin to update the details and dates of a system feature record. |
| FR-8.3 | The system shall allow Faculty advisers and Admin to delete a system feature record. |
| FR-8.4 | The system shall allow Faculty advisers, panelists, and Admin to add text comments to a system feature entry, supporting a review and feedback workflow. |
| FR-8.5 | The system shall allow any authenticated user to retrieve system feature records by group. |
| FR-8.6 | The system shall allow any authenticated user to retrieve comments for a system feature entry. |
| FR-8.7 | The system shall allow students to view their group's system feature list in both a list view and a Gantt/timeline view. |

### 4.9 Consultation Logging

| ID | Requirement |
|---|---|
| FR-9.1 | The system shall allow Faculty advisers to create consultation log entries for a capstone group. Each entry shall record: consultation date, mode (in-person / online), discussion content, and outcome. |
| FR-9.2 | Each consultation log entry shall optionally be linked to a specific chapter submission. |
| FR-9.3 | The system shall allow Faculty advisers to update or delete their own consultation log entries. |
| FR-9.4 | The system shall allow Faculty advisers and Admin to retrieve all consultation logs, filtered to the adviser's own groups for Faculty users. Admin and SuperAdmin can see all logs. |
| FR-9.5 | The system shall allow any authenticated user to retrieve consultation logs for a specific group. |
| FR-9.6 | The system shall notify the capstone group members when a new consultation log entry is created for their group. |

### 4.10 Consultation Schedule Management

| ID | Requirement |
|---|---|
| FR-10.1 | The system shall allow Faculty users (FacultyIC) and Admin to create consultation schedule slots, specifying: title, date, time, mode, location/link, and maximum capacity. |
| FR-10.2 | The system shall allow the schedule owner (FacultyIC) and Admin to update or change the status (Active, Full, Cancelled, Completed) of a consultation schedule slot. |
| FR-10.3 | The system shall allow student groups to request a specific consultation schedule slot, providing a note or agenda item. |
| FR-10.4 | The system shall allow the FacultyIC and Admin to view all slot requests for a given schedule and respond (Approve or Reject) to each request. |
| FR-10.5 | The system shall allow student groups to view the requests they have submitted and their response status. |
| FR-10.6 | The system shall allow the FacultyIC to retrieve the consultation schedules they own. |
| FR-10.7 | The system shall allow any authenticated user to retrieve all consultation schedules. |

### 4.11 Defense Scheduling and Panel Assignment

| ID | Requirement |
|---|---|
| FR-11.1 | The system shall allow Admin and SuperAdmin to create a defense schedule entry for a capstone group, specifying: scheduled date and time, venue, and the list of assigned panelists (Faculty users). |
| FR-11.2 | The system shall allow Admin and SuperAdmin to update a defense schedule (date, time, venue, panelists) at any time before finalization. |
| FR-11.3 | The system shall allow Admin and SuperAdmin to cancel a defense schedule, updating its status to `Cancelled`. |
| FR-11.4 | The system shall notify the assigned panelists, the group's adviser, and the student group members when a defense is scheduled, rescheduled, or cancelled. |
| FR-11.5 | The system shall allow Faculty users to retrieve the defense schedules for which they are assigned as panelists (`my-schedules`). |
| FR-11.6 | The system shall allow Admin and Faculty users to retrieve all defense schedules they are authorized to view. |
| FR-11.7 | The system shall allow any authenticated user to retrieve defense schedules for a specific capstone group. |

### 4.12 Defense Rating and Evaluation

| ID | Requirement |
|---|---|
| FR-12.1 | The system shall allow Admin and SuperAdmin to define evaluation criteria (name, description, weight percentage, maximum score) used to rate oral defenses. |
| FR-12.2 | The system shall enforce an **Admin-controlled evaluation window**: only Admin and SuperAdmin can open (`isRatingOpen = true`) or close (`isRatingOpen = false`) the rating window for a defense schedule. Faculty panelists cannot toggle this setting. |
| FR-12.3 | The system shall allow Faculty panelists to submit ratings for an assigned defense only when the rating window is open (`isRatingOpen = true`). If the window is closed, the system shall reject rating submissions with an appropriate error. |
| FR-12.4 | The rating form shall present all defined evaluation criteria. For each criterion, the panelist shall enter a numerical score and may optionally enter qualitative comments. |
| FR-12.5 | The system shall automatically compute a weighted score per criterion using the formula: `(score / maxScore) × weight`. |
| FR-12.6 | The system shall aggregate ratings from all assigned panelists and compute a consolidated group defense score. |
| FR-12.7 | The system shall display the consolidated defense score and per-panelist breakdown to Admin and SuperAdmin after all ratings are submitted. |
| FR-12.8 | Once the Admin closes the evaluation window (`isRatingOpen = false`), existing panelist ratings shall become **immutable** — no further submission or modification shall be accepted by the system. |
| FR-12.9 | The system shall allow Admin and SuperAdmin to **finalize** defense ratings, recording the finalized state with the admin's identity and finalization timestamp. |
| FR-12.10 | The system shall display the defense rating status (open / locked / finalized) on the defense card visible to all authorized users. |

### 4.13 Progress Monitoring Dashboard

| ID | Requirement |
|---|---|
| FR-13.1 | The system shall compute a **health score** (0–100) for each active capstone group based on weighted sub-scores for: chapter completion rate, consultation frequency, system feature progress, and defense readiness. |
| FR-13.2 | The system shall classify each group into a risk level: `Excellent` (≥ 80), `OnTrack` (≥ 60), `NeedsAttention` (≥ 40), or `AtRisk` (< 40). |
| FR-13.3 | The system shall provide a monitoring summary for Faculty and Admin users showing: total group count, counts per risk level, and average health score across all monitored groups. |
| FR-13.4 | Faculty advisers shall see monitoring data scoped to only their assigned groups. Admin and SuperAdmin see all groups. |
| FR-13.5 | The system shall provide a per-group health detail view showing individual metric breakdowns: chapter score, consultation score, system feature score, defense score, and derived risk level. |
| FR-13.6 | Students shall be able to view the health monitoring data for their own group. |

### 4.14 Notification System

| ID | Requirement |
|---|---|
| FR-14.1 | The system shall send an in-app notification to a user when a relevant event occurs. The notification shall include: a human-readable message, event type, creation timestamp, and read/unread status. |
| FR-14.2 | The system shall send notifications for the following events at minimum: chapter submitted, chapter status updated, revision notes added, consultation logged, consultation schedule request responded to, defense scheduled, defense cancelled/rescheduled, consultation log created, document submitted for review (`DocumentSubmitted`), and document status updated by adviser (`DocumentStatusUpdated`). |
| FR-14.3 | The system shall allow users to mark individual notifications as read. |
| FR-14.4 | The system shall allow users to mark all notifications as read in a single action. |
| FR-14.5 | The system shall display an unread notification count indicator in the interface for authenticated users. |
| FR-14.6 | The system shall allow users to retrieve their full notification list, ordered by creation date descending. |

### 4.15 Role-Specific Dashboards

| ID | Requirement |
|---|---|
| FR-15.1 | The system shall provide a **Student Dashboard** showing: a personalized welcome banner with group name, project title, and academic year; a chapter progress bar (approved / total); stat cards for chapters submitted, chapters needing attention, consultation count, and next scheduled defense with its phase label and color; an **Upcoming Deadlines** section displaying the next three group deadlines sorted by due date with urgency color coding (red ≤ 3 days, amber ≤ 7 days, blue otherwise); a full-width **Chapter Submissions** list with status color coding; a **Recent Activity** notification feed rendered immediately below the Chapter Submissions section and above the lower grid; a **My Defense Schedule** list with phase-colored indicators; and quick-action links to document upload, manuscript editor, consultation calendar, and system tracker. |
| FR-15.2 | The system shall provide a **Faculty Dashboard** showing: stat cards for advised group count, pending chapter reviews, upcoming defense assignments (as adviser or panelist), and consultation count for the current month; a **Pending Chapter Reviews** section listing chapter submissions with `PendingReview` or `UnderRevision` status across all advised groups; an **Upcoming Defense Assignments** section listing scheduled defenses where the faculty is assigned as adviser or panelist, with phase-colored indicators; an **Advised Groups** list showing each group's milestone completion percentage via a progress bar; an **Upcoming Consultation Slots** list showing the next three time slots the faculty has created; an **Adviser Document Review** entry point (list view at `/adviser/manuscript-review`) allowing the faculty to see all documents submitted for review across advised groups, filtered by status, and navigate to the per-document review page (`/documents/review/:id`); and quick-action links to manuscript review, defense scheduler, rubric manager, and consultation manager. Sections are hidden when no data is present. |
| FR-15.3 | The system shall provide an **Admin Dashboard** showing: stat cards for active group count, classroom count (with enrollment total), upcoming defense count, and active user count; a **Defense Pipeline** card breaking down defenses by phase (Title, Proposal, Final) with completed and upcoming counts per phase; a **Group Overview** card showing active vs. archived group counts and a consultation health breakdown (on-track ≥ 75%, moderate 50–74%, at-risk < 50%); a **User Distribution** card with per-role user counts and a visual bar; **Alert Banners** for at-risk groups (consultation score < 50%), defenses in the next 7 days, and deactivated accounts; a **Group Consultation Monitoring** table showing each group's total consultations, last-30-day consultations, score, and a health progress bar; an **Upcoming Defenses** sidebar list with phase color dots; and quick-action links to the defense scheduler, rubric manager, user management, and reports. |
| FR-15.4 | The system shall provide a **SuperAdmin Dashboard** showing: all information visible on the Admin Dashboard; stat cards for total user count (active/inactive breakdown), active group count, classroom count, and upcoming defense count; a **User Distribution** card with role breakdown bars and additional rows showing active account ratio and 2FA adoption percentage; a **System Health** card combining active/archived group and classroom counts with a consultation health breakdown; a **Recent Users** list showing the five most recently registered accounts with role color badges; and **Alert Banners** for at-risk groups, upcoming defenses, and deactivated accounts. |

### 4.16 Report Generation

| ID | Requirement |
|---|---|
| FR-16.1 | The system shall generate a **per-group progress report** (PDF) for a specified capstone group, including: group details, adviser name, chapter-by-chapter completion status, and consultation log summary. |
| FR-16.2 | The system shall generate a **milestone completion rate report** (PDF) for a specified academic year, showing completion percentages across all groups in a tabular format. |
| FR-16.3 | The system shall generate a **defense outcome report** (PDF) for a specified defense schedule, including: group details, per-panelist scores per criterion, weighted totals, and the consolidated defense score. |
| FR-16.4 | The system shall generate an **all-groups summary report** (PDF) filterable by adviser, academic year, date range, and group, suitable for CHED quality-assurance documentation. |
| FR-16.5 | All generated reports shall be delivered as downloadable PDF files rendered server-side using QuestPDF. |
| FR-16.6 | Report access shall be restricted to Admin, SuperAdmin, and Faculty users. The all-groups summary report shall be restricted to Admin and SuperAdmin. |

---

## 5. Non-Functional Requirements (NFR)

NFRs are organized according to the **ISO/IEC 25010:2023** quality dimensions: Functional Suitability, Reliability, Usability, Performance Efficiency, Maintainability, Portability, and Security.

---

### 5.1 Functional Suitability

| ID | Requirement |
|---|---|
| NFR-1.1 | **Completeness:** The system shall implement all functional requirements specified in Section 4 without omission or degradation of scope. |
| NFR-1.2 | **Correctness:** All weighted defense score computations shall be mathematically accurate to two decimal places. All timestamps shall reflect Philippine Standard Time (UTC+8). |
| NFR-1.3 | **Appropriateness:** Every system function shall map to a documented stakeholder need. No feature shall expose functionality to a role that is not authorized to use it, even through direct API calls. |
| NFR-1.4 | **Role Completeness:** The Faculty role unification shall correctly grant access to all adviser, panelist, and FacultyIC functions based on actual database assignments, without requiring role hierarchy changes for legitimate concurrent assignments. |
| NFR-1.5 | **Thesis Formatting Compliance:** All DOCX files generated by the manuscript editor's Finalize and Export actions shall conform to PSU Lingayen academic formatting standards: Courier New typeface at 12pt, double line spacing, 1.5-inch left margin, and 1-inch top, right, and bottom margins, with a centered page-number footer. Formatting shall be applied client-side using the `docx` npm library prior to upload or download, ensuring no dependency on server-side HTML conversion. |

### 5.2 Reliability

| ID | Requirement |
|---|---|
| NFR-2.1 | **Availability:** The system shall be available during institutional operating hours with a target uptime of 99% Monday through Saturday. |
| NFR-2.2 | **Data Integrity:** All database write operations (chapter submission, rating submission, manuscript save) shall be wrapped in atomic transactions. Partial writes that could result in inconsistent state shall not be committed. |
| NFR-2.3 | **Referential Integrity:** All foreign key relationships in the database schema shall be enforced at the database level. Records that reference a group, user, or defense that no longer exists shall not be permitted. |
| NFR-2.4 | **Fault Tolerance:** In the event of a SignalR disconnection during collaborative manuscript editing, the Yjs CRDT state shall allow clients to re-synchronize and merge changes without data loss upon reconnection. |
| NFR-2.5 | **Recoverability:** The database shall be backed up on a scheduled daily basis. A documented recovery procedure shall exist with a defined Recovery Time Objective (RTO). |
| NFR-2.6 | **Idempotency:** Re-submitting a rating or a chapter file in the case of a network retry shall not create duplicate records. The system shall detect and handle duplicate submissions gracefully. |
| NFR-2.7 | **Auto-Save Reliability:** The manuscript editor's auto-save mechanism shall ensure that no more than two seconds of user-entered content changes are at risk of loss due to a browser closure or network failure, given that a stable server connection exists. The auto-save debounce timer shall be cleared and a save triggered immediately upon any explicit Ctrl+S / Cmd+S invocation, regardless of how recently the previous save occurred. |

### 5.3 Usability

| ID | Requirement |
|---|---|
| NFR-3.1 | **Role-Scoped Navigation:** Each role shall be presented only with the sidebar navigation items and page features relevant to their role and current assignments. Faculty users shall see a combined navigation covering all functions available through any of their active assignments. |
| NFR-3.2 | **Learnability:** A first-time user of any role shall be able to complete their primary task (e.g., chapter submission for a student, rating entry for a panelist) within the first session without formal training, using interface labels and contextual guidance alone. |
| NFR-3.3 | **Consistency:** The system shall apply a uniform visual design across all pages — navy primary (`#0a1628`), gold accent (`#c9a84c`), consistent card layouts, and Tailwind CSS utility classes — to reduce cognitive load. |
| NFR-3.4 | **Feedback:** The system shall provide clear, immediate visual feedback for all user actions: loading indicators for async operations, success/error messages for form submissions, and badge indicators for status changes. |
| NFR-3.5 | **Responsiveness:** The interface shall render correctly and remain fully functional on desktop (≥ 1280 px), tablet (768–1279 px), and mobile (< 768 px) viewports using Tailwind CSS responsive utilities. |
| NFR-3.6 | **Accessibility:** Interactive elements (buttons, inputs, links) shall have sufficient color contrast and legible label text to support users with moderate visual impairments. |
| NFR-3.7 | **Empty States:** Every list or data view shall display a meaningful empty-state message and a suggested action when no records exist, preventing user confusion. |
| NFR-3.8 | **Grammar and Spell Check Usability:** The grammar and spelling checker in the manuscript editor shall follow a 2-second debounce to avoid disruptive mid-word interruptions. Detected errors shall be indicated by visually distinct wavy underlines (red for misspelling, blue for grammar) rendered as non-intrusive inline decorations that do not obstruct the text cursor or selection. Hovering over any underlined segment shall display a tooltip containing the diagnostic message and up to five suggested corrections. The checker shall silently suppress results when the external API is unavailable to prevent user-facing error states during transient network failures. |

### 5.4 Performance Efficiency

| ID | Requirement |
|---|---|
| NFR-4.1 | **Response Time:** Standard page data requests (dashboard, group list, chapter list) shall return responses within 3 seconds under normal operational load on the deployed server. |
| NFR-4.2 | **Query Optimization:** All Entity Framework Core queries shall use selective `.Include()` statements to avoid loading unnecessary related data (N+1 query prevention). Frequently filtered columns (user ID, group ID, status) shall be indexed. |
| NFR-4.3 | **Concurrent Users:** The system shall support the target user population concurrently — approximately 200 students, 20 faculty members, and 5 administrators — without measurable performance degradation. |
| NFR-4.4 | **File Handling:** Uploaded chapter files and documents shall be validated (type, size) before processing. File storage shall use server-side disk paths organized by group and version to prevent path collisions. |
| NFR-4.5 | **Real-Time Efficiency:** SignalR manuscript collaboration connections shall broadcast only incremental Yjs binary updates (not full content snapshots) to minimize bandwidth on every keystroke. |

### 5.5 Maintainability

| ID | Requirement |
|---|---|
| NFR-5.1 | **Architecture:** The system shall maintain a strict separation between the API layer (ASP.NET Core Controllers), service layer (Business Logic via Service classes implementing interfaces), and data layer (Entity Framework Core DbContext), enabling independent testing and modification of each layer. |
| NFR-5.2 | **Frontend Modularity:** The React SPA shall be organized into: `pages/` (route-level components), `components/` (reusable UI), `contexts/` (global state), `services/` (API calls), and `hooks/` (shared logic), ensuring clear separation of concerns. |
| NFR-5.3 | **Database Migrations:** All schema changes shall be implemented using Entity Framework Core code-first migrations, providing a traceable, versioned history of all database modifications. |
| NFR-5.4 | **Dependency Injection:** All services shall be registered via ASP.NET Core's built-in DI container and consumed via constructor injection to enable substitution and unit testing. |
| NFR-5.5 | **Testability:** Service-layer methods (e.g., score computation, authorization checks, manuscript section logic) shall be independent of HTTP context and testable in isolation with a mocked `AppDbContext`. |
| NFR-5.6 | **Object Mapping:** All data transfers between service layer and API responses shall use AutoMapper DTOs to ensure model changes do not cascade unintentionally to API contracts. |

### 5.6 Portability

| ID | Requirement |
|---|---|
| NFR-6.1 | **Browser Compatibility:** The SPA shall function correctly on current stable releases of Google Chrome, Microsoft Edge, and Mozilla Firefox. |
| NFR-6.2 | **Server Compatibility:** The ASP.NET Core 10 API shall be deployable to any IIS or Kestrel environment on Windows Server, or to a Linux container, without code modification. |
| NFR-6.3 | **Database Compatibility:** The data layer shall use standard EF Core abstractions, limiting vendor lock-in. Migration to an alternative EF Core–compatible RDBMS shall require only a provider swap and migration regeneration. |
| NFR-6.4 | **Build Portability:** The React SPA shall be buildable on any Node.js 18+ environment via `npm install && npm run build`, producing a static asset bundle deployable to any web server or CDN. |

### 5.7 Security

| ID | Requirement |
|---|---|
| NFR-7.1 | **Password Storage:** User passwords shall be stored as salted hashes using ASP.NET Core Identity's default PBKDF2 algorithm. Plaintext passwords shall never be stored or logged. |
| NFR-7.2 | **Token Security:** JWT tokens shall be signed with a symmetric HMAC-SHA256 key. Tokens shall have a defined expiry. The signing key shall be stored in server configuration, never in source code. |
| NFR-7.3 | **Authorization Enforcement:** Every API endpoint that modifies data or returns sensitive information shall be decorated with `[Authorize]` and the appropriate role constraint. The frontend role-guard shall be considered a UX aid only — security shall be enforced exclusively at the API level. |
| NFR-7.4 | **Assignment-Based Authorization:** For Faculty users, access to group-specific resources (manuscript, chapters, consultations, document review) shall be verified against actual database assignment records (adviser, panelist, FacultyIC) at the service layer, not merely against the JWT role claim. The `PATCH /documents/{id}/status` endpoint shall return `403 Forbidden` to any Faculty caller who is not the group's assigned adviser. |
| NFR-7.5 | **Data Transmission:** All client–server communication shall be encrypted via HTTPS/TLS. HTTP connections shall be redirected to HTTPS. |
| NFR-7.6 | **File Upload Security:** Uploaded files shall be validated by both file extension and magic-byte (binary signature) inspection before storage. Files shall be stored outside the web root with non-guessable server paths to prevent direct access. |
| NFR-7.7 | **XSS Prevention:** Manuscript HTML content rendered in the browser shall be sanitized using DOMPurify before insertion into the DOM to prevent cross-site scripting attacks. |
| NFR-7.8 | **Audit Trail:** The following actions shall be recorded in the audit log with acting user ID, target user/resource, action type, and Philippine Standard Time timestamp: login (success and failure), role change, account deactivation, password reset, email change, and 2FA toggle. |
| NFR-7.9 | **Data Privacy:** Handling of student personal data (name, email, academic records) shall comply with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173). Personal data shall not be exposed in URL parameters or unencrypted storage. |
| NFR-7.10 | **Two-Factor Authentication:** When 2FA is enabled on an account, the JWT token shall not be issued until the user provides a valid, time-limited OTP delivered via email. Brute-force protection on the OTP endpoint shall be enforced. |
| NFR-7.11 | **Document Review Comment Sanitization:** All rich-text comment content submitted through the Adviser Document Review page shall be sanitized server-side before storage and additionally sanitized client-side using DOMPurify before rendering via `dangerouslySetInnerHTML`. The sanitization shall strip any script tags, event handlers, and other executable content while preserving permitted formatting markup (bold, italic, underline, highlight, color). |

---

## 6. Constraints and Assumptions

| # | Constraint / Assumption |
|---|---|
| C-1 | The system is deployed on-premises or in a private hosting environment at PSU Lingayen. Public internet deployment is not an initial requirement. |
| C-2 | An SMTP server (or transactional email service) is available and configured for email verification, password reset, and 2FA OTP delivery. |
| C-3 | Microsoft SQL Server is the target database engine. |
| C-4 | All users are assumed to have access to a modern web browser and an internet/intranet connection. |
| C-5 | The academic year format used throughout the system follows the convention `YYYY-YYYY` (e.g., `2024-2025`). |
| C-6 | Capstone groups in the system represent BSIT students completing an IT capstone project that includes both a manuscript (thesis document) and a software system component. |
| C-7 | Grammar and spell checking (FR-7.16) relies on the LanguageTool public API (`https://api.languagetool.org/v2/check`). This service is subject to external rate limits (approximately 20 requests per minute and 75,000 characters per day for anonymous callers). Institutions requiring higher throughput should deploy a self-hosted LanguageTool instance. |
| C-8 | Client-side DOCX generation (FR-7.18) requires the user's browser to execute JavaScript; the feature is unavailable if JavaScript is disabled. |

---

## 7. Traceability Matrix

| FR Section | Module | NFR Categories Applicable |
|---|---|---|
| 4.1 — Authentication & Access Control | User Authentication | NFR-7.1, 7.2, 7.3, 7.8, 7.10 |
| 4.2 — User & Role Management | Role Management | NFR-7.3, 7.4 |
| 4.3 — Group Management | Capstone Group | NFR-1.3, 2.3 |
| 4.4 — Classroom Management | Classroom | NFR-3.1, 3.2 |
| 4.5 — Chapter Submission | Chapter Review | NFR-4.4, 7.6 |
| 4.6 — Document Management (FR-6.1–6.7) | Documents — Upload & Versioning | NFR-4.4, 7.6 |
| 4.6 — Document Section Workflow (FR-6.8–6.9) | Documents — Section Types & Status | NFR-1.3, 2.2 |
| 4.6 — Document Submission & Approval (FR-6.10–6.13) | Documents — Student Submit / Adviser Act | NFR-7.3, 7.4, 2.2 |
| 4.6 — Adviser Review Page (FR-6.14–6.15) | Documents — Adviser Review UI | NFR-7.7, 7.11, 3.4 |
| 4.6 — Adviser Review List & Student Upload UI (FR-6.16–6.17) | Documents — List & Student Cards | NFR-3.3, 3.4, 3.7 |
| 4.7 — Manuscript Collaborative Editor (FR-7.1–7.13) | Manuscript | NFR-2.4, 4.5, 7.7 |
| 4.7 — Manuscript Auto-Save (FR-7.14–7.15) | Manuscript — Auto-Save | NFR-2.7, 3.4 |
| 4.7 — Grammar & Spell Check (FR-7.16) | Manuscript — Language Checking | NFR-3.8, 6.1 |
| 4.7 — Comment Highlight Removal (FR-7.17) | Manuscript — Inline Comments | NFR-1.1, 3.4 |
| 4.7 — Finalize & Formatted DOCX (FR-7.18) | Manuscript — Finalize / Export | NFR-1.5, 4.4, 6.1 |
| 4.8 — System Feature Tracker | Feature Tracker | NFR-3.7 |
| 4.9 — Consultation Logging | Consultations | NFR-2.2 |
| 4.10 — Consultation Schedules | Consultation Mgmt | NFR-3.2 |
| 4.11 — Defense Scheduling | Defense Scheduling | NFR-2.2, 2.3 |
| 4.12 — Defense Rating | Evaluation | NFR-1.2, 2.2, 7.3, 7.4 |
| 4.13 — Progress Monitoring | Monitoring | NFR-1.2, 4.2 |
| 4.14 — Notifications | Notifications | NFR-4.1 |
| 4.15 — Dashboards | Dashboards | NFR-3.1, 3.3 |
| 4.16 — Report Generation | Reports | NFR-1.2, 5.6 |
