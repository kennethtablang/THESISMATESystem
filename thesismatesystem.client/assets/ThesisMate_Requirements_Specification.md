# ThesisMate — System Features and Software Requirements Specification (SRS)

**System:** ThesisMate — Progress Monitoring and Defense Rating System for Capstone Projects of BSIT Students
**Institution:** Pangasinan State University – Lingayen Campus, Science and Technology Department
**Technology Stack:** ASP.NET Core MVC, C#, Entity Framework Core, Microsoft SQL Server, Bootstrap 5, CSS3, JavaScript/jQuery

---

## 1. System Overview

ThesisMate is a web-based, role-differentiated platform that consolidates capstone project **progress monitoring** and **oral defense rating** into a single relational-database-backed system. It replaces the manual, paper- and spreadsheet-based workflows currently used by faculty advisers, defense panelists, and student researchers by centralizing chapter submissions, consultation records, defense scheduling, evaluation scoring, and academic reporting under a unified Model-View-Controller (MVC) architecture.

---

## 2. User Roles (Actors)

| Role | Description | Primary System Interactions |
|---|---|---|
| **Student (Capstone Group Member)** | Member of a registered BSIT capstone group | Submit chapters, view submission status, view consultation logs, receive notifications |
| **Faculty Adviser / Research Adviser** | Faculty member assigned to mentor one or more capstone groups | Review submissions, update chapter status, log consultations, view milestone progress |
| **Defense Panelist** | Faculty/professional assigned to evaluate oral defenses | Encode numerical and qualitative ratings, view assigned defense schedules |
| **Program Coordinator / Administrator** | Manages system-wide configuration and oversight | Manage accounts, register groups, schedule defenses, assign panels, generate reports |

---

## 3. Core System Features

| # | Feature / Module | Description |
|---|---|---|
| 1 | **User Authentication & Role-Based Access Control (RBAC)** | Secure, role-based login governing access to module-specific views and actions for the four user roles. |
| 2 | **Student Group & Capstone Project Management** | Registration and maintenance of capstone groups, group members, assigned adviser, and approved research title. |
| 3 | **Progress Monitoring & Chapter Submission** | Digital, timestamped upload of capstone chapters with status tracking (Pending, Under Revision, Approved) and revision history. |
| 4 | **Consultation Logging** | Structured recording of adviser–student advisory sessions (date, content, outcome) tied to specific groups and chapters. |
| 5 | **Defense Scheduling & Panel Assignment** | Scheduling of oral defense sessions and assignment of panel members per group. |
| 6 | **Defense Rating & Evaluation** | Digital, standardized rating interface for numerical scoring, weighted computation, multi-panelist aggregation, and qualitative comments. |
| 7 | **Automated Notification System** | Real-time, in-app notifications for status changes, feedback, consultation updates, and defense schedules. |
| 8 | **Role-Specific Dashboards** | Personalized dashboards for Students, Advisers, Panelists, and Coordinators summarizing relevant data at a glance. |
| 9 | **Report Generation & Analytics** | Exportable reports on progress, milestone completion rates, and defense outcomes for CHED quality-assurance documentation. |

---

## 4. Functional Requirements (FR)

### 4.1 User Authentication and Access Control

| ID | Requirement |
|---|---|
| FR-1.1 | The system shall allow registered users to log in using a unique username/institutional email and password. |
| FR-1.2 | The system shall authenticate each user and assign exactly one role: Student, Faculty Adviser, Defense Panelist, or Program Coordinator/Administrator. |
| FR-1.3 | The system shall enforce role-based access control (RBAC), restricting access to controllers, views, and actions according to the authenticated user's role. |
| FR-1.4 | The system shall allow administrators to create, update, deactivate, and delete user accounts. |
| FR-1.5 | The system shall provide a password reset/recovery mechanism for registered users. |
| FR-1.6 | The system shall automatically terminate a user session after a defined period of inactivity. |
| FR-1.7 | The system shall record an audit log of all login attempts, including timestamp, user, and success/failure status. |

### 4.2 Student Group and Capstone Project Management

| ID | Requirement |
|---|---|
| FR-2.1 | The system shall allow coordinators/administrators to register a capstone group, including group name, member list, and assigned adviser. |
| FR-2.2 | The system shall allow exactly one Faculty/Research Adviser to be assigned to each capstone group. |
| FR-2.3 | The system shall allow recording and approval of a group's research project title/topic. |
| FR-2.4 | The system shall allow authorized users to edit group details (members, adviser assignment, project title) with changes logged. |
| FR-2.5 | The system shall maintain and display lists of active and completed (archived) capstone groups. |

### 4.3 Progress Monitoring and Chapter Submission

| ID | Requirement |
|---|---|
| FR-3.1 | The system shall allow students to upload capstone chapter manuscripts (Chapters 1–5) in digital file format. |
| FR-3.2 | The system shall automatically timestamp every manuscript submission for audit and tracking purposes. |
| FR-3.3 | The system shall retain a version/revision history of each chapter per group, including all prior submissions. |
| FR-3.4 | The system shall allow advisers to view and download submitted chapters for review. |
| FR-3.5 | The system shall allow advisers to update the status of a chapter submission (e.g., Pending Review, Under Revision, Approved). |
| FR-3.6 | The system shall allow advisers to attach written revision notes to a specific chapter submission. |
| FR-3.7 | The system shall display a real-time milestone progress overview (e.g., chapter approval status, defense readiness) for each group. |
| FR-3.8 | The system shall allow students to view their own submission history and current chapter statuses. |

### 4.4 Consultation Logging

| ID | Requirement |
|---|---|
| FR-4.1 | The system shall allow advisers to create consultation log entries recording date, mode (in-person/online), discussion content, and outcome. |
| FR-4.2 | The system shall associate each consultation log entry with a specific capstone group and, where applicable, a specific chapter. |
| FR-4.3 | The system shall display the chronological consultation history of a group to its adviser and to program coordinators. |
| FR-4.4 | The system shall automatically timestamp all consultation log entries upon creation. |

### 4.5 Defense Scheduling and Panel Assignment

| ID | Requirement |
|---|---|
| FR-5.1 | The system shall allow coordinators to create oral defense schedules, including date, time, and venue/link, for a capstone group. |
| FR-5.2 | The system shall allow coordinators to assign one or more panelists to a scheduled defense session. |
| FR-5.3 | The system shall notify the assigned panelists, adviser, and student group of scheduled defense details upon creation or change. |
| FR-5.4 | The system shall allow coordinators to reschedule or cancel a defense session, with automatic notification to all affected users. |

### 4.6 Defense Rating and Evaluation

| ID | Requirement |
|---|---|
| FR-6.1 | The system shall present panelists with a digital rating form listing the standardized evaluation criteria defined by the BSIT program. |
| FR-6.2 | The system shall allow each panelist to input a numerical score per evaluation criterion for an assigned group's defense. |
| FR-6.3 | The system shall allow panelists to enter qualitative comments/annotations alongside numerical scores. |
| FR-6.4 | The system shall automatically compute weighted scores per criterion based on predefined weight values. |
| FR-6.5 | The system shall aggregate ratings from all assigned panelists into a single consolidated group score. |
| FR-6.6 | The system shall display consolidated defense results to coordinators once all panelist ratings are submitted. |
| FR-6.7 | The system shall prevent edits to finalized ratings except by administrators, with all modifications recorded in an audit trail. |

### 4.7 Automated Notification System

| ID | Requirement |
|---|---|
| FR-7.1 | The system shall notify a student group when an adviser updates a chapter status or adds revision notes. |
| FR-7.2 | The system shall notify the adviser when a student group submits or resubmits a chapter. |
| FR-7.3 | The system shall notify relevant users of upcoming defense schedules and submission deadlines. |
| FR-7.4 | The system shall display in-app notifications with an unread-notification indicator/count. |

### 4.8 Role-Specific Dashboards

| ID | Requirement |
|---|---|
| FR-8.1 | The system shall provide a Student Dashboard showing current chapter status, submission history, and notifications. |
| FR-8.2 | The system shall provide an Adviser Dashboard showing all assigned groups, their chapter statuses, and milestone progress. |
| FR-8.3 | The system shall provide a Panelist Dashboard showing assigned defense schedules and access to the rating interface. |
| FR-8.4 | The system shall provide a Coordinator/Administrator Dashboard showing system-wide analytics, completion rates, and defense outcome summaries. |

### 4.9 Report Generation

| ID | Requirement |
|---|---|
| FR-9.1 | The system shall generate per-group progress reports summarizing chapter completion status. |
| FR-9.2 | The system shall generate milestone completion rate reports across all groups for a given academic term. |
| FR-9.3 | The system shall generate defense outcome reports showing individual panelist scores and consolidated results. |
| FR-9.4 | The system shall allow generated reports to be exported in a printable/exportable format (e.g., PDF) for CHED quality-assurance documentation. |
| FR-9.5 | The system shall allow reports to be filtered by group, adviser, defense panel, and date range. |

---

## 5. Non-Functional Requirements (NFR)

NFRs are organized according to the **ISO/IEC 25010:2023** quality dimensions adopted as the study's acceptability evaluation framework: functionality, reliability, usability, efficiency, maintainability, and portability. A dedicated **Security** subsection is also included, as security controls (RBAC enforcement, data protection) are foundational to a system handling student academic records.

### 5.1 Functional Suitability (Functionality)

| ID | Requirement |
|---|---|
| NFR-1.1 | **Completeness:** The system shall implement all functional requirements specified in Section 4 without omission. |
| NFR-1.2 | **Correctness:** Weighted score computations in the defense rating module shall be mathematically accurate to two decimal places. |
| NFR-1.3 | **Appropriateness:** All system functions shall map directly to a documented stakeholder need identified during requirements gathering. |

### 5.2 Reliability

| ID | Requirement |
|---|---|
| NFR-2.1 | **Availability:** The system shall be available during institutional operating hours (e.g., 99% uptime, Monday–Saturday). |
| NFR-2.2 | **Fault Tolerance / Data Integrity:** Database transactions (e.g., chapter submission, rating finalization) shall be atomic and consistent, leveraging SQL Server transaction management to prevent partial writes. |
| NFR-2.3 | **Recoverability:** The system database shall be backed up on a scheduled basis (e.g., daily) and recoverable within a defined Recovery Time Objective (RTO). |
| NFR-2.4 | **Referential Integrity:** All relational tables shall enforce primary key/foreign key constraints to prevent orphaned or inconsistent records (e.g., a submission cannot exist without a valid group reference). |

### 5.3 Usability

| ID | Requirement |
|---|---|
| NFR-3.1 | **Learnability:** A first-time user of any role shall be able to complete their primary task (e.g., chapter submission, rating entry) within a defined number of clicks/steps without prior training. |
| NFR-3.2 | **Operability:** Each role shall be presented only with navigation options and dashboard widgets relevant to that role. |
| NFR-3.3 | **User Interface Consistency:** The system shall apply a consistent visual design (color scheme, typography, component styling) across all views using Bootstrap 5 and custom CSS3. |
| NFR-3.4 | **Responsiveness:** The user interface shall render correctly and remain usable on desktop, tablet, and mobile-sized viewports. |

### 5.4 Performance Efficiency

| ID | Requirement |
|---|---|
| NFR-4.1 | **Time Behavior:** Standard page views (dashboards, submission lists) shall load within an acceptable response time (e.g., ≤ 3 seconds) under normal load. |
| NFR-4.2 | **Resource Utilization:** Database queries shall be optimized (e.g., indexed columns, efficient LINQ/EF Core queries) to minimize server resource consumption. |
| NFR-4.3 | **Capacity:** The system shall support concurrent access by the target user population (approx. 200 students, 10 advisers, 10 panelists, and administrative staff) without significant degradation in performance. |

### 5.5 Maintainability

| ID | Requirement |
|---|---|
| NFR-5.1 | **Modularity:** The system shall be implemented using the MVC architectural pattern, with clear separation between Models, Views, and Controllers. |
| NFR-5.2 | **Reusability:** Common UI elements (e.g., notification components, status badges) shall be implemented as reusable partial views/components. |
| NFR-5.3 | **Modifiability:** Database schema changes shall be managed through Entity Framework Core migrations to support traceable, incremental updates. |
| NFR-5.4 | **Testability:** Controller and service-layer logic shall be structured to support unit testing independent of the UI layer. |

### 5.6 Portability

| ID | Requirement |
|---|---|
| NFR-6.1 | **Adaptability:** The system shall function correctly on current versions of major web browsers (e.g., Chrome, Edge, Firefox). |
| NFR-6.2 | **Installability:** The system shall be deployable to a standard ASP.NET Core-compatible hosting environment (e.g., IIS on Windows Server) with documented setup steps. |
| NFR-6.3 | **Device Compatibility:** The responsive design shall ensure consistent functionality across desktop, laptop, tablet, and mobile devices. |

### 5.7 Security

| ID | Requirement |
|---|---|
| NFR-7.1 | **Authentication Security:** User passwords shall be stored using a secure, salted hashing algorithm (e.g., via ASP.NET Core Identity) — never in plaintext. |
| NFR-7.2 | **Authorization Enforcement:** Role-based access restrictions shall be enforced at the controller/action level, not only hidden in the UI, to prevent unauthorized access via direct URL navigation. |
| NFR-7.3 | **Data Transmission:** All client-server communication shall be encrypted via HTTPS/TLS. |
| NFR-7.4 | **Audit Logging:** Critical actions (rating submission/finalization, account management, status overrides) shall be logged with user identity and timestamp. |
| NFR-7.5 | **Data Privacy Compliance:** Handling of student personal data shall comply with the Philippine Data Privacy Act of 2012 (RA 10173). |

---

## 6. Traceability Note

Each functional module in Section 4 corresponds to one of the **Core System Features** in Section 3, and each NFR category in Section 5 corresponds to one of the six ISO/IEC 25010:2023 acceptability dimensions evaluated through the study's survey instrument (functionality, reliability, usability, efficiency, maintainability, portability), ensuring full traceability from requirements through to evaluation.
