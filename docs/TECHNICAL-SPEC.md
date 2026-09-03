# TaskFlow — Technical Specification

This document translates `docs/PRD.md` into an implementation-ready technical design. It defines architecture, data models, APIs, real-time behavior, security, testing, and deployment. It does not contain application code and nothing described here has been implemented yet.

---

## 1. Technology Stack

**Frontend**
- React (UI library)
- Vite (build tool / dev server)
- React Router (client-side routing)
- Context API or Redux Toolkit (global state — auth session, active board state, notifications)
- Tailwind CSS (styling)

**Backend**
- Node.js + Express.js (HTTP API server)
- MongoDB + Mongoose (database and ODM)
- Socket.io (real-time bidirectional events)

**Authentication & Security**
- JWT (access + refresh tokens)
- bcrypt (password hashing)

**Uploads**
- Multer (multipart form handling, local disk storage initially)

**Testing**
- Jest (test runner/assertions)
- Supertest (HTTP endpoint testing)

---

## 2. Project Architecture

Monorepo-style layout with a clear frontend/backend split, deployed as two independent services.

```
TaskFlow/
├── docs/
│   ├── PRD.md
│   └── TECHNICAL-SPEC.md
├── client/                        # React + Vite frontend
│   ├── src/
│   │   ├── api/                   # axios/fetch wrappers per resource (auth, boards, tasks, ...)
│   │   ├── components/            # reusable UI (Board, List, TaskCard, CommentThread, etc.)
│   │   ├── context/ (or store/)   # Context API providers or Redux Toolkit slices
│   │   ├── hooks/                 # custom hooks (useAuth, useSocket, useBoard, ...)
│   │   ├── pages/                 # route-level views (Login, Dashboard, BoardView, ...)
│   │   ├── routes/                # React Router configuration, protected route wrappers
│   │   ├── sockets/                # Socket.io client setup and event listeners
│   │   ├── utils/                 # formatting, validation helpers
│   │   └── App.jsx / main.jsx
│   └── vite.config.js
│
├── server/                        # Node.js + Express backend
│   ├── src/
│   │   ├── config/                 # env loading, db connection, cors, socket setup
│   │   ├── models/                 # Mongoose schemas (User, Board, Task, Comment, ...)
│   │   ├── routes/                 # Express routers per resource
│   │   ├── controllers/            # request handlers / business logic entry points
│   │   ├── services/                # reusable business logic (auth service, notification service)
│   │   ├── middleware/              # auth guard, role guard, validation, error handler, rate limiter
│   │   ├── sockets/                  # Socket.io event handlers, namespaces/rooms
│   │   ├── validators/              # request schema validation (e.g., express-validator/Joi/Zod)
│   │   ├── utils/                    # token generation, response helpers
│   │   └── app.js / server.js
│   ├── uploads/                     # local file storage (MVP; gitignored)
│   └── tests/                       # Jest + Supertest suites
│
└── (root-level config: .env.example, README, etc. — not created at this stage)
```

**Design principles**
- Clear separation: routes define endpoints, controllers handle request/response, services hold reusable business logic, models define data shape.
- Frontend talks to backend only via a defined REST API + Socket.io events — no direct DB access from the client.
- Shared conventions (naming, response shape, error format) applied consistently across all resources.

---

## 3. Database Design (MongoDB / Mongoose)

### 3.1 Collections Overview

**User**
- `_id`, `name`, `email` (unique), `passwordHash`, `globalRole` (`admin` | `user`), `avatarUrl`, `isActive`, `createdAt`, `updatedAt`
- `globalRole` distinguishes system-wide Admins from regular users; board-level role (Manager/Member) is defined per-board via `BoardMember`.

**Board**
- `_id`, `name`, `description`, `visibility` (`private` | `team`), `ownerId` (ref: User), `labels` (array of `{ name, color }`), `lists` (array of `{ _id, name, position }` — embedded, since lists are lightweight and board-scoped), `isArchived`, `createdAt`, `updatedAt`

**BoardMember**
- `_id`, `boardId` (ref: Board), `userId` (ref: User), `role` (`manager` | `member`), `invitedAt`, `joinedAt`
- Join collection representing per-board membership and role; a User's permissions on a given Board are resolved via this collection (plus global `admin` override).
- Unique compound index on `(boardId, userId)`.

**Task**
- `_id`, `boardId` (ref: Board), `listId` (embedded list `_id` within Board), `title`, `description`, `assignees` (array of ref: User), `dueDate`, `priority` (`low` | `medium` | `high`), `labels` (array of label refs/names), `status` (mirrors list, for query convenience), `position` (order within list), `isArchived`, `createdBy` (ref: User), `createdAt`, `updatedAt`

**Comment**
- `_id`, `taskId` (ref: Task), `authorId` (ref: User), `body`, `mentions` (array of ref: User), `isEdited`, `createdAt`, `updatedAt`

**Attachment**
- `_id`, `taskId` (ref: Task), `uploadedBy` (ref: User), `fileName`, `storedFileName`, `filePath`, `mimeType`, `sizeBytes`, `createdAt`

**Activity**
- `_id`, `boardId` (ref: Board), `taskId` (ref: Task, optional), `actorId` (ref: User), `actionType` (e.g., `task.created`, `task.moved`, `member.added`, `comment.posted`), `metadata` (flexible object describing the change), `createdAt`
- Append-only; no update/delete operations exposed via API.

**Notification**
- `_id`, `recipientId` (ref: User), `type` (`assignment` | `mention` | `due_date` | `invitation`), `sourceBoardId`, `sourceTaskId` (optional), `message`, `isRead`, `createdAt`

### 3.2 Key Relationships
- `Board 1—N BoardMember N—1 User`: many-to-many between Users and Boards, mediated by `BoardMember`, which also carries the board-scoped role.
- `Board 1—N Task`: a task always belongs to one board and one list (list embedded in board).
- `Task 1—N Comment`, `Task 1—N Attachment`: both cascade-relevant on task deletion (soft delete preferred; see PRD §9).
- `Board 1—N Activity`, `Task 1—N Activity` (optional): activity entries reference the board always, and the task when applicable.
- `User 1—N Notification`: notifications are always addressed to a single recipient.

### 3.3 Indexing Notes (practical, not exhaustive)
- `User.email`: unique index.
- `BoardMember`: compound unique index on `(boardId, userId)`.
- `Task`: index on `(boardId, listId, position)` for ordered retrieval; text index on `title`/`description` for search.
- `Activity`: index on `(boardId, createdAt)` for paginated history.
- `Notification`: index on `(recipientId, isRead, createdAt)`.

---

## 4. Authentication Architecture

**Register**
- Client submits name/email/password → server validates input, checks email uniqueness, hashes password with bcrypt, creates `User`, returns access token + sets refresh cookie (auto-login on register).

**Login**
- Client submits email/password → server verifies credentials against `passwordHash` using bcrypt compare → on success, issues a short-lived JWT **access token** (returned in response body, held in memory on the client) and a longer-lived JWT **refresh token** (set as an **httpOnly, secure, SameSite cookie**, not readable by JavaScript).

**Access Token**
- Short expiry (e.g., 15 minutes). Sent by the client as a `Authorization: Bearer <token>` header on API requests. Verified by auth middleware on every protected route.

**Refresh Token**
- Longer expiry (e.g., 7 days). Stored only in the httpOnly cookie. A dedicated `POST /api/auth/refresh` endpoint reads the cookie, verifies the refresh token, and issues a new access token (and optionally rotates the refresh token) without requiring the user to re-enter credentials.

**httpOnly Cookie**
- Set with `httpOnly`, `secure` (production), and `SameSite=Strict` or `Lax` attributes to mitigate XSS token theft and reduce CSRF exposure.

**Logout**
- Client calls `POST /api/auth/logout` → server clears the refresh cookie and invalidates the refresh token server-side (e.g., token blacklist/versioning or a stored session record tied to the user).

**Password Hashing**
- All passwords hashed with bcrypt (configurable salt rounds) before persisting; raw passwords are never logged or stored.

---

## 5. Authorization

Two layers of role apply:
1. **Global role** (on `User.globalRole`): `admin` or `user`.
2. **Board-scoped role** (on `BoardMember.role`): `manager` or `member`, applicable only within the context of a specific board.

| Capability | Admin | Manager (on their board) | Member (on their board) |
|---|---|---|---|
| Manage all users / global settings | ✅ | ❌ | ❌ |
| View/access all boards | ✅ | Only boards they belong to | Only boards they belong to |
| Create a board | ✅ | ✅ | ✅ (becomes Manager of it) |
| Edit/archive/delete a board | ✅ | ✅ (own board) | ❌ |
| Add/remove board members, change board-level roles | ✅ | ✅ (own board) | ❌ |
| Create/edit lists | ✅ | ✅ | ✅ (per PRD §10, subject to board settings) |
| Create/edit/move tasks | ✅ | ✅ | ✅ |
| Delete tasks | ✅ | ✅ | Own created tasks only (configurable) |
| Comment on tasks | ✅ | ✅ | ✅ |
| Edit/delete others' comments | ✅ | ✅ (override) | ❌ (own comments only) |
| Upload/delete attachments | ✅ | ✅ | ✅ (own uploads; Manager can override delete) |
| View activity log | ✅ | ✅ (own board) | ✅ (own board) |

Authorization is enforced server-side on every request (middleware chain: `authenticate` → `loadBoardMembership` → `requireRole`), never trusted from client-side state alone.

---

## 6. API Architecture

All endpoints are prefixed `/api`. Responses follow a consistent JSON envelope (see §9). Endpoints below define **purpose only** — implementation comes in a later phase.

**Auth** — `/api/auth`
- `POST /register` — create a new user account
- `POST /login` — authenticate and issue tokens
- `POST /refresh` — exchange valid refresh cookie for a new access token
- `POST /logout` — invalidate session / clear refresh cookie
- `POST /password-reset-request` / `POST /password-reset-confirm` — password reset flow (per PRD §7)

**Users** — `/api/users`
- `GET /me` — current authenticated user's profile
- `PATCH /me` — update own profile
- `GET /` — (Admin) list users
- `PATCH /:id/role` — (Admin) change a user's global role or active status

**Boards** — `/api/boards`
- `GET /` — list boards the current user belongs to (or all, if Admin)
- `POST /` — create a board
- `GET /:boardId` — get board detail (lists, labels, membership summary)
- `PATCH /:boardId` — update board settings
- `DELETE /:boardId` — archive/soft-delete a board
- `POST /:boardId/lists` / `PATCH /:boardId/lists/:listId` / `DELETE /:boardId/lists/:listId` — manage lists within a board

**Board Members** — `/api/boards/:boardId/members`
- `GET /` — list members and their roles
- `POST /` — invite/add a member
- `PATCH /:memberId` — change a member's board-level role
- `DELETE /:memberId` — remove a member from the board

**Tasks** — `/api/boards/:boardId/tasks`
- `GET /` — list/search/filter/paginate tasks on a board
- `POST /` — create a task
- `GET /:taskId` — get task detail
- `PATCH /:taskId` — update task fields
- `PATCH /:taskId/move` — change list/position (kanban drag-and-drop)
- `DELETE /:taskId` — archive/soft-delete a task

**Comments** — `/api/tasks/:taskId/comments`
- `GET /` — list comments on a task (paginated)
- `POST /` — add a comment (parses @mentions, triggers notifications)
- `PATCH /:commentId` — edit own comment
- `DELETE /:commentId` — delete own comment (or Manager/Admin override)

**Attachments** — `/api/tasks/:taskId/attachments`
- `GET /` — list attachments on a task
- `POST /` — upload a file (Multer middleware)
- `DELETE /:attachmentId` — delete an attachment (owner or Manager/Admin)
- `GET /:attachmentId/download` — download the file

**Activity** — `/api/boards/:boardId/activity`
- `GET /` — paginated activity log for a board (optionally filtered by `taskId`)

**Notifications** — `/api/notifications`
- `GET /` — list current user's notifications (paginated, filter by read/unread)
- `PATCH /:id/read` — mark one notification as read
- `PATCH /read-all` — mark all as read

---

## 7. Real-Time Architecture (Socket.io)

**Connection & Rooms**
- On socket connection, the client authenticates using the JWT access token (passed via handshake auth payload). The server verifies the token before allowing event subscriptions.
- Clients join a **room per board** (e.g., room name `board:<boardId>`) when viewing that board, via a `board:join` event. They leave the room (`board:leave`) when navigating away.

**Event Catalog**

| Event (client → server) | Purpose |
|---|---|
| `board:join` | Subscribe to a board's room after verifying membership |
| `board:leave` | Unsubscribe from a board's room |
| `task:create` | Notify server a task was created (or server emits after REST call) |
| `task:update` | Task field(s) edited |
| `task:move` | Task moved between lists/positions |
| `task:delete` | Task archived/deleted |
| `comment:create` | New comment posted |
| `presence:update` | Client reports it is actively viewing/editing a given task or board |

| Event (server → clients in room) | Purpose |
|---|---|
| `task:created` | Broadcast new task to all board viewers |
| `task:updated` | Broadcast field changes |
| `task:moved` | Broadcast new list/position for a task |
| `task:deleted` | Broadcast removal |
| `comment:created` | Broadcast new comment (and trigger client-side notification badge) |
| `member:online` / `member:offline` | Presence roster changes for the board |
| `notification:new` | Push a real-time notification to a specific user's personal room (`user:<userId>`) |

**Design notes**
- REST endpoints remain the source of truth for writes; after a successful REST mutation, the server emits the corresponding Socket.io event to the relevant board room. This keeps a single validated write path while still enabling real-time fan-out.
- Each authenticated user also joins a personal room (`user:<userId>`) for direct notification delivery regardless of which board they're viewing.
- Presence/online-viewer tracking is maintained in-memory per Socket.io server instance for MVP (acceptable for a single-instance deployment); scaling to multiple instances would require a shared adapter (e.g., Redis) — noted as future scope, not implemented now.

---

## 8. File Upload Architecture

- **Multer** handles `multipart/form-data` uploads on the attachment upload endpoint.
- **Storage (MVP):** local disk, under `server/uploads/`, with generated unique filenames (e.g., UUID + original extension) to avoid collisions and path traversal.
- **Validation:** allowed MIME types and a maximum file size enforced at the Multer configuration level (e.g., `limits.fileSize`) and re-checked server-side before persisting the `Attachment` record.
- **Metadata:** original filename, stored filename, MIME type, size, uploader, and timestamp saved to the `Attachment` collection; the file itself lives on disk, not in MongoDB.
- **Serving files:** downloads served through an authenticated Express route (not static-served publicly) so board membership can be verified before releasing a file.
- **Future scope:** swap local disk for cloud object storage (e.g., S3) behind the same `Attachment` interface, per PRD §21 — no code changes anticipated beyond the storage adapter.

---

## 9. Validation & Error Handling

**Request Validation**
- All incoming request bodies/params/query strings validated against defined schemas (e.g., using a library such as `express-validator`, `Joi`, or `Zod`) before reaching controller logic.
- Validation failures short-circuit with a `400` response before any database access.

**Centralized Error Handling**
- A single Express error-handling middleware (registered last) catches errors thrown or passed via `next(err)` from anywhere in the request lifecycle.
- Custom `AppError` class (or equivalent) carries a `statusCode` and `message`, allowing controllers/services to throw meaningful, typed errors.
- Unhandled/unexpected errors are logged server-side and return a generic `500` message to the client (no stack traces leaked in production).

**Consistent API Response Shape**

Success:
```json
{ "success": true, "data": { /* resource or list */ }, "meta": { /* pagination, etc. — optional */ } }
```

Error:
```json
{ "success": false, "error": { "message": "Human-readable message", "code": "OPTIONAL_ERROR_CODE" } }
```

- All endpoints, regardless of resource, follow this envelope so the frontend can handle responses generically.

---

## 10. Security

| Area | Practical Protection |
|---|---|
| Passwords | Hashed with bcrypt (never stored/logged in plaintext); minimum password strength enforced at registration. |
| JWT | Short-lived access tokens; refresh tokens rotated on use; tokens signed with a strong secret from environment variables; algorithm explicitly pinned (e.g., HS256). |
| Cookies | Refresh token in `httpOnly`, `secure` (prod), `SameSite=Strict/Lax` cookie; never exposed to client-side JS. |
| CORS | Explicit allow-list of trusted frontend origin(s); credentials enabled only for those origins. |
| Rate Limiting | Applied to `/api/auth/*` endpoints (and other sensitive routes) to blunt brute-force/credential-stuffing attempts. |
| Input Validation | Schema validation on every endpoint; reject unexpected fields; sanitize free-text fields rendered back to users (comment bodies, task titles) to mitigate stored XSS. |
| Authorization | Server-side role checks on every protected route (never relying on client-side hiding of UI alone). |
| File Uploads | Restricted MIME types and size limits; generated filenames (no user-controlled paths); files served through an authenticated route rather than a public static directory. |
| MongoDB Queries | Mongoose schema typing reduces injection surface; explicit casting/validation of query inputs (e.g., ObjectId checks) to prevent NoSQL operator injection (`$ne`, `$gt`, etc. from user input). |
| Environment Variables | Secrets (JWT signing keys, DB connection string, cookie secrets) loaded from `.env` (not committed); `.env.example` documents required keys with placeholder values only. |

---

## 11. Testing Strategy

Using **Jest** (test runner/assertions) and **Supertest** (HTTP integration testing) on the backend.

**Authentication tests**
- Register: success, duplicate email rejected, weak password rejected.
- Login: success issues access token + refresh cookie; wrong password/nonexistent user rejected.
- Refresh: valid refresh cookie issues new access token; expired/invalid/missing cookie rejected.
- Logout: refresh cookie cleared and subsequent refresh attempts fail.

**Permission/authorization tests**
- Member cannot delete a board or remove members (expect `403`).
- Manager can manage their own board but not boards they don't belong to.
- Admin can access/manage any board.
- Non-members cannot read/write tasks, comments, or attachments on a board they don't belong to.

**API/integration tests (per resource)**
- Boards: create/read/update/archive, with and without correct role.
- Tasks: CRUD, move between lists (position updates correctly), search/filter/pagination behavior.
- Comments: create/edit/delete ownership rules, @mention parsing triggers a notification record.
- Attachments: valid upload succeeds; oversized/disallowed file type rejected; download requires board membership.
- Activity log: expected entries created after key actions (task created/moved, member added).
- Notifications: created on assignment/mention; mark-as-read updates state correctly.

**Non-functional checks**
- Centralized error handler returns the consistent error envelope for a range of induced failures (validation error, not-found, unauthorized).
- Basic rate-limit behavior on auth endpoints (e.g., N+1 rapid requests rejected).

Frontend testing approach (component/unit tests) can be layered in later using the same Jest foundation; not detailed further at this stage to avoid over-engineering the plan.

---

## 12. Deployment Architecture (Simple Production Plan)

- **Frontend (React/Vite):** built as a static bundle (`vite build`) and served via a static hosting platform or CDN (e.g., Vercel, Netlify, or an Nginx-served static bucket). Environment-specific API base URL injected at build time.
- **Backend (Node/Express + Socket.io):** deployed as a single Node.js process on a platform such as Render, Railway, or a basic VM/container (e.g., Docker on a small cloud instance). Runs behind HTTPS (via the platform's TLS termination or an Nginx reverse proxy).
- **Database (MongoDB):** hosted on MongoDB Atlas (managed) for MVP, with connection string and credentials supplied via environment variables; IP allow-listing or VPC peering restricts access to the backend service.
- **Uploaded Files:** persisted on a durable disk volume attached to the backend service (MVP, local storage per §8). Because local disk is not shared across instances, MVP deployment assumes a **single backend instance**; horizontal scaling would require migrating to shared/cloud storage (S3) first — documented as future scope, not solved now.
- **Environment Variables:** managed through the hosting platform's secret/environment configuration (JWT secrets, Mongo URI, cookie domain, CORS allow-list, upload size limits) — never committed to source control.
- **Process/uptime:** basic process manager or platform-native restart policy (e.g., PM2 or the hosting platform's built-in supervisor) to keep the Node process alive; logs captured via the platform's standard logging.

This deployment plan intentionally favors simplicity over scalability for the MVP; multi-instance scaling, CDN-backed file storage, and load balancing are noted as future infrastructure work, not part of this phase.
