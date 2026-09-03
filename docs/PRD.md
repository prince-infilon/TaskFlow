# TaskFlow — Product Requirements Document (PRD)

## 1. Product Vision
TaskFlow is a professional, real-time collaborative task management application that lets teams organize work into boards, lists, and tasks — similar in spirit to Trello or Asana, but focused on a lean, production-ready feature set. TaskFlow aims to give small-to-mid-sized teams a fast, reliable, and secure way to plan, track, and communicate about work without the complexity of larger enterprise tools.

## 2. Problem Statement
Teams often coordinate work through scattered channels — chat messages, spreadsheets, and email — leading to lost context, unclear ownership, and duplicated effort. Existing tools are either too simplistic (a plain to-do list with no collaboration) or too complex (enterprise suites with steep learning curves). TaskFlow addresses the gap by providing a focused, real-time, kanban-style workflow with clear roles, permissions, and visibility into who is doing what and when.

## 3. Target Users
- **Team Managers / Project Leads** — create boards, assign work, monitor progress.
- **Team Members / Contributors** — execute tasks, update status, collaborate via comments.
- **Administrators** — manage organization-level settings, users, and access control.
- **Small-to-mid-sized teams** (startups, agencies, internal departments) needing lightweight, real-time coordination without heavyweight project-management overhead.

## 4. Main User Journey
1. User signs up / logs in (JWT-based authentication).
2. User creates or is invited to a **workspace/board**.
3. User creates **lists** (e.g., To Do, In Progress, Done) within a board.
4. User creates **tasks** within lists, assigns members, sets due dates, priorities, and labels.
5. User (and teammates) collaborate in real time — dragging tasks across the kanban board, commenting, attaching files.
6. User receives **notifications** when assigned, mentioned, or when a watched task changes.
7. User searches/filters tasks across boards, and reviews the **activity log** for history and accountability.

## 5. Core Features
- User authentication (signup, login, logout, session refresh)
- Workspace/board creation and management
- List and task management (CRUD)
- Kanban-style drag-and-drop workflow
- Real-time updates across all connected clients
- Comments on tasks
- File attachments on tasks
- Activity/audit log per board and task
- Search, filter, and pagination across tasks/boards
- Notifications (in-app, real-time)
- Role-based permissions (Admin / Manager / Member)
- Responsive UI for desktop and mobile use

## 6. Roles & Permissions Overview

### Admin
- Full system access across all workspaces/boards.
- Manage users (invite, deactivate, change roles).
- Access to all boards and settings, including security/audit settings.

### Manager
- Create, edit, archive, and delete boards they own or are granted access to.
- Add/remove members on their boards.
- Assign tasks, set due dates/priorities, manage lists.
- View activity logs and reports for their boards.

### Member
- View boards they belong to.
- Create and edit tasks they are assigned to or create.
- Comment on tasks, attach files.
- Move tasks across the kanban workflow (subject to board permissions).
- Cannot manage board membership or delete boards.

## 7. Authentication Requirements
- Email/password-based signup and login.
- Passwords hashed with **bcrypt** before storage; plaintext passwords never persisted or logged.
- **JWT access tokens** (short-lived) used to authorize API requests.
- **JWT refresh tokens** (longer-lived) used to silently renew access tokens.
- Refresh tokens stored in an **httpOnly, secure cookie** (not accessible to client-side JavaScript) to reduce XSS risk.
- Logout invalidates the refresh token/session.
- Support for password reset flow (MVP: basic email-based reset; can be stubbed initially).
- Rate limiting on login/signup endpoints to reduce brute-force risk.

## 8. Board Management
- Users can create boards with a name, description, and visibility (private/team).
- Boards contain an ordered set of **lists** (columns), which contain **tasks** (cards).
- Board owners/managers can invite members by email or username, and assign roles per board.
- Boards can be archived (soft-deleted) rather than immediately hard-deleted, to preserve history.
- Board-level settings: member list, labels/tags available on the board, default permissions.

## 9. Task Management
- Tasks belong to exactly one list at a time and have: title, description, assignee(s), due date, priority, labels/tags, status, and creation/update timestamps.
- Tasks support checklists/subtasks (MVP: optional/simple; may be deferred to future scope — see Section 21).
- Tasks can be created, edited, moved, archived, and deleted (soft delete preferred for audit purposes).
- Task ordering within a list is preserved (position/index) and updates on drag-and-drop.

## 10. Kanban Workflow
- Boards render as columns (lists) with draggable task cards.
- Users can drag tasks between lists to update status (e.g., To Do → In Progress → Done).
- List order and task order within lists are persisted and synced across all clients.
- Lists can be created, renamed, reordered, and archived by users with sufficient permissions.

## 11. Real-Time Collaboration
- All board changes (task moves, edits, new comments, new tasks, member changes) propagate live to all connected clients viewing that board via **Socket.io**.
- Presence indicators (optional MVP+): show which users are currently viewing/editing a board.
- Conflict handling: last-write-wins at the field level is acceptable for MVP, with activity log providing an audit trail.

## 12. Comments
- Users can add threaded or flat comments to any task.
- Comments support @mentions of board members, which trigger notifications.
- Comments display author, timestamp, and support edit/delete by the original author (or Admin/Manager override).

## 13. File Attachments
- Users can attach files to tasks (e.g., documents, images).
- MVP storage: local disk via **Multer**, with a defined size limit and allowed file-type restrictions.
- Attachments display filename, size, uploader, and upload timestamp; downloadable by board members.
- Future scope: migrate to cloud object storage (e.g., S3) — see Section 21.

## 14. Activity Log
- Every significant action (task created/moved/edited/deleted, member added/removed, comment posted, board settings changed) is recorded with actor, action type, target, and timestamp.
- Activity log is viewable per-board (and optionally per-task) for accountability and history review.
- Logs are append-only and not user-editable.

## 15. Search / Filter / Pagination
- Search tasks by title/description keywords within a board or across all boards a user has access to.
- Filter tasks by assignee, label/tag, priority, due date range, and status/list.
- Paginated results for task lists, activity logs, and notifications to ensure performance at scale.

## 16. Notifications
- In-app real-time notifications for: task assignment, @mentions in comments, due-date reminders, and board invitations.
- Notification center shows unread/read state and supports marking as read.
- Delivered via Socket.io for real-time push while the user is connected; persisted in the database for retrieval on next login.

## 17. Permissions
- Enforced at both the API layer (server-side authorization checks on every request) and reflected in the UI (hiding/disabling actions the user cannot perform).
- Role checks apply at the organization level (Admin) and board level (Manager/Member).
- Sensitive actions (deleting boards, removing members, changing roles) restricted to Admin/Manager as appropriate.

## 18. Security Requirements
- All passwords hashed with bcrypt (never stored or logged in plaintext).
- JWT access tokens short-lived; refresh tokens rotated and stored in httpOnly, secure, SameSite cookies.
- Input validation and sanitization on all API endpoints to prevent injection attacks.
- Protection against common web vulnerabilities: XSS, CSRF (via SameSite cookies/CSRF tokens where applicable), and NoSQL injection.
- File upload validation: restrict file types and sizes to prevent malicious uploads.
- Rate limiting on authentication and other sensitive endpoints.
- HTTPS enforced in production; secure cookie flags enabled in production environments.
- Least-privilege principle applied to all role-based operations.

## 19. Responsive Requirements
- Fully responsive UI supporting desktop, tablet, and mobile viewports.
- Kanban board view adapts to smaller screens (e.g., horizontal scroll or stacked list view on mobile).
- Touch-friendly drag-and-drop interactions on mobile/tablet devices.
- Built with Tailwind CSS utility classes to ensure consistent responsive behavior across components.

## 20. MVP Scope
- User authentication (signup, login, logout, JWT access + refresh flow).
- Board creation, editing, and membership management.
- List and task CRUD with kanban drag-and-drop.
- Real-time sync of task/list/board changes via Socket.io.
- Comments on tasks.
- Basic file attachments (local storage via Multer).
- Activity log per board.
- Search, filter, and pagination for tasks.
- In-app notifications for assignment and mentions.
- Role-based permissions (Admin / Manager / Member).
- Responsive UI across desktop and mobile.

## 21. Future / Bonus Features
- Cloud-based file storage (e.g., AWS S3) replacing local disk storage.
- Email notifications in addition to in-app notifications.
- Subtasks/checklists with progress tracking.
- Calendar view and Gantt-style timeline view.
- Third-party integrations (Slack, GitHub, Google Calendar).
- Advanced analytics/reporting dashboards.
- Presence indicators and live cursors during collaboration.
- Dark mode and user-customizable themes.
- Multi-workspace / organization-level billing and management.
- Mobile native apps (iOS/Android).

## 22. Success Criteria
- Users can complete the full core journey (sign up → create board → create tasks → collaborate in real time) without errors.
- Real-time updates propagate to all connected clients within an acceptable latency (sub-second on standard connections).
- Role-based permissions are correctly enforced on every protected action, verified via automated tests (Jest + Supertest).
- No critical security vulnerabilities in authentication or file upload flows.
- Application remains responsive and functional across common desktop and mobile screen sizes.
- Core API endpoints and permission logic are covered by automated tests prior to release.

---

## Intended Technical Stack (Reference Only — Not for Implementation Yet)

**Frontend:** React, Vite, React Router, Context API or Redux Toolkit, Tailwind CSS
**Backend:** Node.js, Express.js
**Database:** MongoDB, Mongoose
**Real-time:** Socket.io
**Authentication:** JWT (access + refresh tokens), httpOnly refresh-token cookie, bcrypt
**Uploads:** Multer (local storage initially)
**Testing:** Jest, Supertest

*Note: This section is for reference only. No implementation, package installation, or scaffolding beyond this document should occur at this stage.*
