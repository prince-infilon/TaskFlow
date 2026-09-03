# TaskFlow — Development Plan

This document is the implementation roadmap and progress tracker for TaskFlow. It sequences the work defined in `docs/PRD.md`, `docs/TECHNICAL-SPEC.md`, and `docs/UI-UX-SPEC.md` into a logical build order, from an empty repository to a production-deployed application. It is a checklist, not implementation code — no application code, packages, or scaffolding are created by this document itself.

Each phase lists an **Objective**, **Main Tasks**, **Important Dependencies** (what must already be done, and what this phase unblocks), and a **Completion Checklist** to check off as work is verified done. Check off a phase in the progress tracker below only once its own completion checklist is fully checked.

---

## Progress Tracker

**PLANNING**
- [x] PRD
- [x] Technical Specification
- [x] UI/UX Specification
- [x] Development Plan

**IMPLEMENTATION**
- [x] Phase 1 — Project Foundation
- [ ] Phase 2 — Database
- [ ] Phase 3 — Authentication
- [ ] Phase 4 — Authorization
- [ ] Phase 5 — Boards & Members
- [ ] Phase 6 — Tasks
- [ ] Phase 7 — Comments & Attachments
- [ ] Phase 8 — Activity & Notifications
- [ ] Phase 9 — Real-Time
- [ ] Phase 10 — Frontend UI
- [ ] Phase 11 — Integration & UX
- [ ] Phase 12 — Testing & Security
- [ ] Phase 13 — Production

---

## Phase 1 — Project Foundation

**Objective:** Stand up an empty but working full-stack skeleton — client and server run, talk to each other, and the repo structure matches `TECHNICAL-SPEC.md` §2 — before any real feature work begins.

**Main Tasks**
- Initialize the repository structure per Technical Spec §2 (`client/`, `server/`, `docs/`).
- Frontend setup: scaffold React + Vite app, install React Router, set up Tailwind CSS, establish base folder structure (`src/api`, `src/components`, `src/context` or `src/store`, `src/hooks`, `src/pages`, `src/routes`, `src/sockets`, `src/utils`).
- Backend setup: scaffold Node.js + Express app, establish base folder structure (`src/config`, `src/models`, `src/routes`, `src/controllers`, `src/services`, `src/middleware`, `src/sockets`, `src/validators`, `src/utils`), add `server.js`/`app.js` entry point.
- Environment configuration: create `.env.example` for both client and server documenting required variables (API base URL, port, DB URI placeholder, JWT secret placeholders, CORS origin) — no real secrets committed.
- Configure CORS on the backend to allow the frontend's dev origin, with credentials enabled (required for the httpOnly refresh cookie later).
- Basic frontend/backend connection: implement one trivial health-check endpoint (e.g., `GET /api/health`) and call it from the frontend on load to confirm connectivity.
- Set up base linting/formatting conventions (consistent with the naming/response-shape conventions in Technical Spec §2) so later phases build on a consistent baseline.

**Important Dependencies**
- Requires: nothing (first phase).
- Blocks: every subsequent phase — no feature work should start until the skeleton runs end-to-end.

**Completion Checklist**
- [x] `client/` and `server/` directories match the Technical Spec §2 structure
- [x] Frontend dev server runs and renders a base page
- [x] Backend dev server runs and responds on a health-check route
- [x] Frontend successfully calls the backend health-check route (proves CORS + connectivity work)
- [x] `.env.example` present for both client and server
- [x] No secrets committed to source control

---

## Phase 2 — Database

**Objective:** Establish the MongoDB connection and define all Mongoose schemas from `TECHNICAL-SPEC.md` §3, so every later phase has a stable data layer to build against.

**Main Tasks**
- Configure MongoDB connection (local dev instance or Atlas dev cluster) via `src/config`, reading the URI from environment variables.
- Add connection error handling and a clear startup log/failure if the DB is unreachable.
- Define Mongoose models per Technical Spec §3.1: `User`, `Board` (with embedded `lists`), `BoardMember`, `Task`, `Comment`, `Attachment`, `Activity`, `Notification`.
- Implement the relationships described in Technical Spec §3.2 (refs between collections; embedded lists within `Board`).
- Add the indexes described in Technical Spec §3.3: unique index on `User.email`; compound unique index on `BoardMember(boardId, userId)`; index on `Task(boardId, listId, position)` plus a text index on `Task.title`/`description`; index on `Activity(boardId, createdAt)`; index on `Notification(recipientId, isRead, createdAt)`.
- Write minimal model-level validation (required fields, enums for `priority`, `status`, `globalRole`, `role`, `visibility`, `type`) matching the field definitions in Technical Spec §3.1.

**Important Dependencies**
- Requires: Phase 1 (server skeleton and config folder must exist).
- Blocks: Phase 3 (auth needs `User`), Phase 5 (needs `Board`/`BoardMember`), Phase 6 (needs `Task`), Phase 7 (needs `Comment`/`Attachment`), Phase 8 (needs `Activity`/`Notification`).

**Completion Checklist**
- [ ] Server connects to MongoDB successfully on startup
- [ ] All eight models from Technical Spec §3.1 are defined
- [ ] Relationships/refs match Technical Spec §3.2
- [ ] All indexes from Technical Spec §3.3 are created
- [ ] Basic schema validation (required fields, enums) is in place

---

## Phase 3 — Authentication

**Objective:** Implement the full auth flow from `TECHNICAL-SPEC.md` §4 and `PRD.md` §7 — accounts can be created, users can log in/out, and sessions are correctly issued and renewed.

**Main Tasks**
- Registration endpoint: validate input, enforce email uniqueness, hash password with bcrypt, create `User`, auto-issue tokens on success (Technical Spec §4).
- Login endpoint: verify credentials via bcrypt compare, issue short-lived JWT access token (response body) and longer-lived JWT refresh token (httpOnly, secure, SameSite cookie).
- Password hashing: bcrypt with configurable salt rounds; confirm raw passwords are never logged or persisted.
- Access token: signing, short expiry, verification via auth middleware on protected routes, sent as `Authorization: Bearer` header.
- Refresh token: `POST /api/auth/refresh` endpoint that reads the cookie, verifies it, and issues a new access token (rotating the refresh token per Technical Spec §4).
- Logout endpoint: clear the refresh cookie and invalidate the refresh session server-side.
- Auth middleware: `authenticate` middleware that verifies the access token and attaches the user to the request; used by all protected routes going forward.
- Password reset flow: implement at least the basic request/confirm endpoints (PRD §7 — MVP may stub actual email delivery).
- Rate limiting on `/api/auth/*` endpoints (PRD §7, Technical Spec §10).

**Important Dependencies**
- Requires: Phase 2 (`User` model must exist).
- Blocks: Phase 4 (authorization builds on `authenticate`), and every protected route in Phases 5–9.

**Completion Checklist**
- [ ] Register, login, refresh, and logout endpoints implemented and manually verified
- [ ] Passwords are bcrypt-hashed; no plaintext password ever stored or logged
- [ ] Access tokens are short-lived and verified via middleware
- [ ] Refresh tokens are stored only in an httpOnly/secure/SameSite cookie and rotate on use
- [ ] `authenticate` middleware is reusable and applied consistently
- [ ] Password reset request/confirm endpoints exist (stub email acceptable for MVP)
- [ ] Rate limiting is active on auth endpoints

---

## Phase 4 — Authorization

**Objective:** Enforce the two-layer role system from `TECHNICAL-SPEC.md` §5 and `PRD.md` §6 — global roles (Admin/User) and board-scoped roles (Manager/Member) — consistently on the server, on every request.

**Main Tasks**
- Implement `globalRole` checks (Admin vs. regular user) for system-wide actions (e.g., listing all users, changing a user's global role/active status).
- Implement `loadBoardMembership` middleware that resolves a user's board-scoped role (Manager/Member) from `BoardMember`, with an Admin override.
- Implement `requireRole` middleware to gate specific routes/actions by required role(s), composed with `authenticate` and `loadBoardMembership`.
- Apply the full capability matrix from Technical Spec §5 (board management, membership changes, task deletion, comment/attachment override rules, activity log visibility) across the relevant routes as they're built in later phases — this phase establishes the middleware; enforcement is wired in as each resource's routes are implemented in Phases 5–8.
- Confirm the middleware chain order (`authenticate` → `loadBoardMembership` → `requireRole`) is applied consistently and never bypassed.

**Important Dependencies**
- Requires: Phase 3 (`authenticate` middleware and `User.globalRole`).
- Blocks: Phase 5 onward — every resource route (boards, tasks, comments, attachments, members) applies this authorization layer.

**Completion Checklist**
- [ ] `loadBoardMembership` and `requireRole` middleware implemented
- [ ] Middleware chain order is consistent across protected routes
- [ ] Global Admin override works correctly across board-scoped checks
- [ ] Capability matrix (Technical Spec §5) is documented as route-level guards ready to apply in later phases
- [ ] Unauthorized requests correctly return `403`, unauthenticated requests return `401`

---

## Phase 5 — Boards & Members

**Objective:** Implement board and board-membership management end-to-end on the backend, covering `PRD.md` §8 and the `/api/boards` and `/api/boards/:boardId/members` routes from `TECHNICAL-SPEC.md` §6.

**Main Tasks**
- Board CRUD: create, list (scoped to user's membership, or all if Admin), get detail, update, archive (soft delete) — per Technical Spec §6 Boards routes.
- Board lists: create/update/delete the embedded `lists` array within a board (To Do / In Progress / Done and any custom lists), preserving order (per PRD §10).
- Member invitation: `POST /api/boards/:boardId/members` to invite/add a member by email or username, creating a `BoardMember` record.
- Member management: list members (`GET`), remove a member (`DELETE`), matching UI-UX Spec §10 Members panel.
- Role management: `PATCH /api/boards/:boardId/members/:memberId` to change a member's board-scoped role (Manager/Member), enforcing that only Admin/Manager can perform this change (Phase 4 middleware).
- Enforce board creation behavior from Technical Spec §5: a Member who creates a board becomes its Manager.
- Enforce visibility (`private`/`team`) on the board list endpoint.

**Important Dependencies**
- Requires: Phase 2 (`Board`, `BoardMember` models), Phase 3 (`authenticate`), Phase 4 (`loadBoardMembership`, `requireRole`).
- Blocks: Phase 6 (tasks belong to boards/lists), Phase 9 (board rooms), Phase 10 (Boards and Kanban pages need these APIs).

**Completion Checklist**
- [ ] Board CRUD endpoints implemented and permission-checked
- [ ] Lists can be created, renamed, reordered, archived within a board
- [ ] Member invitation and removal endpoints implemented
- [ ] Board-scoped role management endpoint implemented and restricted correctly
- [ ] Creating a board correctly assigns the creator as Manager
- [ ] Archived boards are soft-deleted, not hard-deleted

---

## Phase 6 — Tasks

**Objective:** Implement full task management and the kanban data model from `PRD.md` §9–§10 and the `/api/boards/:boardId/tasks` routes from `TECHNICAL-SPEC.md` §6.

**Main Tasks**
- Task CRUD: create, get list (with search/filter/pagination), get detail, update, archive/delete (soft delete preferred).
- Assignment: support one or more assignees per task (per `Task.assignees`).
- Priority: enforce the `low`/`medium`/`high` enum (Technical Spec §3.1, UI-UX Spec §2.7).
- Due dates: store and validate `dueDate`; support due-date filtering.
- Drag/drop ordering: implement `PATCH /api/boards/:boardId/tasks/:taskId/move` to update `listId`/`status` and `position`, keeping ordering consistent within a list (Technical Spec §6, §3.1).
- Search/filter/pagination: implement search by title/description keyword (using the `Task` text index from Phase 2), filters by assignee/label/priority/due-date range/status, and paginated responses (PRD §15).
- Keep `Task.status` in sync with the list it belongs to, as noted in Technical Spec §3.1.

**Important Dependencies**
- Requires: Phase 2 (`Task` model + indexes), Phase 5 (boards/lists must exist to attach tasks to).
- Blocks: Phase 7 (comments/attachments attach to tasks), Phase 8 (activity entries reference tasks), Phase 9 (task real-time events), Phase 10 (Kanban and Task Detail UI).

**Completion Checklist**
- [ ] Task CRUD endpoints implemented and permission-checked per Technical Spec §5
- [ ] Move endpoint correctly updates list/status/position and keeps ordering consistent
- [ ] Search endpoint uses the text index and returns relevant results
- [ ] Filters (assignee, label, priority, due-date range, status) work individually and combined
- [ ] Pagination is implemented and consistent with the API response envelope (Technical Spec §9)

---

## Phase 7 — Comments & Attachments

**Objective:** Implement task discussion and file attachment features from `PRD.md` §12–§13 and the `/api/tasks/:taskId/comments` and `/api/tasks/:taskId/attachments` routes from `TECHNICAL-SPEC.md` §6 and §8.

**Main Tasks**
- Comments: create, list (paginated), edit (own comment only), delete (own comment, or Manager/Admin override per Technical Spec §5).
- Mentions: parse `@mentions` in comment bodies against board members, store `mentions` on the `Comment`, and trigger a `Notification` record for each mentioned user (feeds Phase 8).
- Multer uploads: configure Multer for `multipart/form-data` handling, local disk storage under `server/uploads/`, generated unique filenames (UUID + extension) to avoid collisions/path traversal.
- Upload validation: enforce allowed MIME types and a maximum file size at the Multer config level, re-validated server-side before persisting the `Attachment` record (Technical Spec §8, §10).
- Attachment management: list attachments on a task, delete (owner or Manager/Admin override), and a download endpoint that verifies board membership before serving the file (never a public static directory).

**Important Dependencies**
- Requires: Phase 2 (`Comment`, `Attachment` models), Phase 6 (tasks must exist to attach comments/files to), Phase 8's `Notification` model should exist or be stubbed before mention-triggered notifications are wired (see note in Phase 8).
- Blocks: Phase 8 (mention notifications), Phase 9 (comment real-time events), Phase 10 (Task Detail UI comments/attachments sections).

**Completion Checklist**
- [ ] Comment CRUD implemented with correct ownership/override rules
- [ ] @mention parsing correctly identifies board members and creates notification records
- [ ] File upload endpoint enforces MIME type and size limits
- [ ] Uploaded files are stored with generated (non-user-controlled) filenames
- [ ] Attachment download requires board membership verification
- [ ] Attachment delete respects ownership/override rules

---

## Phase 8 — Activity & Notifications

**Objective:** Implement the audit trail and in-app notification system from `PRD.md` §14 and §16, and the `/api/boards/:boardId/activity` and `/api/notifications` routes from `TECHNICAL-SPEC.md` §6.

**Main Tasks**
- Activity log: record an `Activity` entry for every significant action defined in PRD §14 (task created/moved/edited/deleted, member added/removed, comment posted, board settings changed), capturing actor, action type, target, and timestamp.
- Ensure the activity log is append-only at the API layer (no update/delete routes exposed).
- Implement `GET /api/boards/:boardId/activity` with pagination, optionally filterable by `taskId`.
- Notifications: generate `Notification` records for task assignment, @mentions (from Phase 7), due-date reminders, and board invitations (PRD §16).
- Implement `GET /api/notifications` (paginated, filterable by read/unread), `PATCH /api/notifications/:id/read`, and `PATCH /api/notifications/read-all`.
- Read/unread state: ensure `isRead` is correctly toggled and reflected in list queries (supports the unread badge in UI-UX Spec §12).

**Important Dependencies**
- Requires: Phase 2 (`Activity`, `Notification` models), Phase 5–7 (actions across boards/tasks/comments/attachments are the events being logged/notified).
- Blocks: Phase 9 (real-time delivery of activity/notification events), Phase 10 (Activity page, Notifications panel).

**Completion Checklist**
- [ ] Activity entries are created for all action types listed in PRD §14
- [ ] Activity log has no update/delete routes exposed
- [ ] Activity endpoint supports pagination and optional task filtering
- [ ] Notifications are generated for all four types in PRD §16
- [ ] Mark-as-read and mark-all-as-read endpoints work correctly
- [ ] Notification list correctly reflects read/unread state

---

## Phase 9 — Real-Time

**Objective:** Layer real-time collaboration on top of the REST API using Socket.io, per `TECHNICAL-SPEC.md` §7 and `PRD.md` §11, so board changes and notifications propagate live to connected clients.

**Main Tasks**
- Socket.io setup: initialize the Socket.io server alongside Express, authenticate socket connections using the JWT access token via the handshake payload.
- Board rooms: implement `board:join`/`board:leave` so clients subscribe to a `board:<boardId>` room after verifying membership.
- Task events: after successful REST mutations, emit `task:created`, `task:updated`, `task:moved`, `task:deleted` to the relevant board room (server remains the source of truth; sockets are fan-out only, per Technical Spec §7 design notes).
- Comment events: emit `comment:created` to the board room after a comment is posted.
- Presence/online users: implement `presence:update` handling and `member:online`/`member:offline` broadcasts, maintained in-memory per server instance for MVP (Technical Spec §7).
- Real-time notifications: have each authenticated user join a personal `user:<userId>` room and emit `notification:new` to it whenever a `Notification` is created (Phase 8).

**Important Dependencies**
- Requires: Phase 5 (boards/membership for room authorization), Phase 6 (task events), Phase 7 (comment events), Phase 8 (notification events).
- Blocks: Phase 10/11's real-time UI behaviors (live kanban updates, live comments, live notification badge) depend on this phase being functional first.

**Completion Checklist**
- [ ] Socket connections are authenticated via JWT before allowing subscriptions
- [ ] Board room join/leave correctly verifies membership
- [ ] All task events (created/updated/moved/deleted) broadcast correctly to board rooms
- [ ] Comment-created events broadcast correctly
- [ ] Presence events (online/offline) work for at least a single-instance deployment
- [ ] Personal notification rooms deliver `notification:new` correctly

---

## Phase 10 — Frontend UI

**Objective:** Build out the complete frontend per `UI-UX-SPEC.md`, section by section, as static/interactive UI wired to local state first — full API/socket integration is handled in Phase 11 to keep this phase focused purely on UI correctness.

**Main Tasks**
- Design system: implement design tokens (colors, typography, spacing, radius, shadows) and core components from UI-UX Spec §2 (buttons, inputs, selects, badges, avatars, cards, modals, dropdowns, tooltips, toasts, loading/empty/error state components).
- Layout: build the authenticated app shell (sidebar, header, main content area) per UI-UX Spec §3, including responsive collapse/drawer behavior.
- Authentication pages: Landing, Login, Register per UI-UX Spec §4.1–§4.3.
- Dashboard: greeting header, task overview strip, My Tasks, Recent Activity, My Boards (UI-UX Spec §5).
- Boards: page header, board grid, Create Board modal, empty state (UI-UX Spec §6).
- Kanban: board header/toolbar, three columns, task cards, drag-and-drop interaction (UI-UX Spec §7).
- Task detail: drawer/modal with all metadata, description, attachments, comments, activity sections (UI-UX Spec §8).
- Activity: chronological feed with day grouping and infinite scroll (UI-UX Spec §9).
- Members: member list, invite modal, role management UI (UI-UX Spec §10).
- Settings: Profile, Preferences, Notifications, Security sections (UI-UX Spec §11).
- Notifications: bell icon, unread badge, dropdown panel (UI-UX Spec §12).
- Responsive behavior: verify all pages against the breakpoint table in UI-UX Spec §13.

**Important Dependencies**
- Requires: Phase 1 (frontend skeleton, Tailwind configured).
- Does not require backend phases to be complete — this phase can proceed in parallel with Phases 2–9 using mock/local data, since it is UI-only.
- Blocks: Phase 11 (integration wires this UI to the real APIs/sockets).

**Completion Checklist**
- [ ] Design system tokens and core components implemented per UI-UX Spec §2
- [ ] App shell implemented and responsive per UI-UX Spec §3
- [ ] All pages listed in UI-UX Spec §4–§12 are built with their specified sections/states
- [ ] Drag-and-drop interaction implemented on the Kanban board (local state acceptable at this stage)
- [ ] All pages verified against desktop, tablet, and mobile breakpoints
- [ ] Accessibility basics (focus states, semantic HTML, form labels) applied per UI-UX Spec §14

---

## Phase 11 — Integration & UX

**Objective:** Connect the Phase 10 frontend to the real backend APIs and Socket.io events from Phases 3–9, replacing mock data with live data and real-time behavior.

**Main Tasks**
- Connect frontend to APIs: implement the `src/api` resource wrappers for auth, boards, tasks, comments, attachments, activity, notifications, members.
- Loading states: wire the skeleton/spinner components from UI-UX Spec §2.6 to real request lifecycles across all pages.
- Error states: wire inline/page-level error states to real API failures, including the centralized error envelope from Technical Spec §9.
- Optimistic updates: implement optimistic UI for task moves (drag-and-drop) and other low-risk mutations, with rollback on failure (per UI-UX Spec §7 drag-and-drop behavior).
- Permission-based UI: hide/disable actions the current user's role does not permit, mirroring the server-side capability matrix (Technical Spec §5) — never relying on the UI alone for enforcement.
- Real-time UI updates: connect the Socket.io client (`src/sockets`) to update the Kanban board, comments, activity feed, and notification badge live, per the event catalog in Technical Spec §7.
- Wire up authenticated routing (protected routes, redirect-to-login, token refresh handling on 401).

**Important Dependencies**
- Requires: Phase 9 (real-time backend), Phase 10 (frontend UI), and effectively all backend phases (3–8) for their respective API surfaces.
- Blocks: Phase 12 (testing needs a functioning integrated app), Phase 13 (production deployment needs a complete, working application).

**Completion Checklist**
- [ ] All pages fetch and display real data from the backend
- [ ] Loading and error states are correctly triggered by real request states
- [ ] Optimistic updates work correctly and roll back cleanly on failure
- [ ] UI correctly reflects role-based permissions for Admin/Manager/Member
- [ ] Real-time events update the UI without requiring a page refresh
- [ ] Protected routes and token refresh flow work correctly end-to-end

---

## Phase 12 — Testing & Security

**Objective:** Verify correctness and security of the integrated application using Jest/Supertest per `TECHNICAL-SPEC.md` §11, and confirm the security controls from §10 are actually in place.

**Main Tasks**
- Jest/Supertest setup: configure the test runner and HTTP integration testing harness in `server/tests`.
- Authentication tests: register (success, duplicate email, weak password), login (success, wrong password, nonexistent user), refresh (valid/expired/invalid/missing cookie), logout (cookie cleared, subsequent refresh fails).
- Permission tests: Member cannot delete a board or remove members (`403`), Manager can manage only their own boards, Admin can access/manage any board, non-members cannot read/write on boards they don't belong to.
- API/integration tests per resource: boards (CRUD + role checks), tasks (CRUD, move/position updates, search/filter/pagination), comments (ownership rules, mention-triggered notifications), attachments (valid/invalid upload, download requires membership), activity log (expected entries after key actions), notifications (created correctly, mark-as-read updates state).
- Security audit: walk through every row of the security table in Technical Spec §10 (passwords, JWT, cookies, CORS, rate limiting, input validation, authorization, file uploads, MongoDB query safety, environment variables) and confirm each is actually implemented, not just planned.
- Validation: confirm schema validation rejects malformed/unexpected input on every endpoint before it reaches controller logic.
- Error handling: confirm the centralized error handler returns the consistent envelope (Technical Spec §9) for validation errors, not-found, and unauthorized cases; confirm no stack traces leak in production mode.

**Important Dependencies**
- Requires: Phase 11 (a fully integrated application to test against).
- Blocks: Phase 13 (do not deploy to production with unresolved test failures or unverified security controls).

**Completion Checklist**
- [ ] Authentication test suite passes
- [ ] Permission/authorization test suite passes
- [ ] Resource-level API tests pass for boards, tasks, comments, attachments, activity, notifications
- [ ] Every item in the Technical Spec §10 security table has been manually verified
- [ ] Input validation confirmed on all endpoints
- [ ] Centralized error handling confirmed consistent and free of leaked internals

---

## Phase 13 — Production

**Objective:** Deploy TaskFlow to production following the simple deployment plan in `TECHNICAL-SPEC.md` §12.

**Main Tasks**
- Production environment configuration: set all required environment variables (JWT secrets, Mongo URI, cookie domain, CORS allow-list, upload size limits) via the hosting platform's secret management — never committed to source control.
- Frontend deployment: build the static bundle (`vite build`) and deploy to the chosen static host/CDN, with the production API base URL injected at build time.
- Backend deployment: deploy the Node/Express + Socket.io process to the chosen platform (or container), running behind HTTPS.
- MongoDB Atlas: provision a managed production cluster, configure connection string/credentials via environment variables, and restrict access via IP allow-listing or VPC peering.
- CORS: set the production allow-list to the deployed frontend origin(s) only, with credentials enabled.
- HTTPS: confirm HTTPS is enforced in production and secure cookie flags are enabled for the refresh-token cookie.
- File storage considerations: confirm the MVP local-disk upload strategy's single-instance constraint is understood and acceptable for launch (Technical Spec §12), or plan the S3 migration if scaling beyond one instance is required before launch.
- Final production testing: run through the core user journey (PRD §4) end-to-end against the production deployment before considering launch complete.

**Important Dependencies**
- Requires: Phase 12 (tests passing, security verified).
- Blocks: nothing — final phase.

**Completion Checklist**
- [ ] Production environment variables configured via platform secrets, none committed to source
- [ ] Frontend successfully built and deployed
- [ ] Backend successfully deployed and reachable over HTTPS
- [ ] MongoDB Atlas cluster provisioned and access-restricted
- [ ] CORS allow-list restricted to production frontend origin(s)
- [ ] Secure cookie flags confirmed active in production
- [ ] File storage constraints understood and documented as acceptable for launch (or S3 migration planned)
- [ ] Full core user journey verified end-to-end in production

---

## Notes

- Phases are ordered by dependency, not strictly by calendar time — Phase 10 (Frontend UI) may run in parallel with Phases 2–9 since it does not require a working backend to begin.
- This plan tracks *what* must be done and in *what order*; it intentionally does not prescribe file-by-file implementation detail, sprint durations, or team assignments — keep it as a checklist, not a spec.
- Update the Progress Tracker checkboxes at the top of this file as each phase's Completion Checklist is fully satisfied.
