# TaskFlow

TaskFlow is a full-stack, real-time Kanban project management platform designed for teams. It features real-time collaboration, role-based access control (RBAC), drag-and-drop task management, file attachments, comment threads, and a comprehensive activity log. 

## Features

- **Authentication & Security:** Secure JWT-based authentication with short-lived access tokens and HttpOnly refresh cookies. Rate limiting, Helmet security headers, and strict input sanitization.
- **Role-Based Access Control (RBAC):** Two-layer authorization. Global roles (Admin/User) and Board-level roles (Manager/Member) with strict boundary enforcement.
- **Real-Time Collaboration:** Socket.io integration provides live updates for task creation, movement, comments, and member presence without page refreshes.
- **Kanban Board:** Drag-and-drop task management with customizable columns, priority flags, due dates, and assignee filters.
- **File Attachments & Comments:** Upload files directly to tasks and collaborate via real-time comment threads.
- **Activity Log & Notifications:** Comprehensive audit trail for board activities and unread notification tracking.

## Architecture

TaskFlow uses a modern MERN stack architecture (MongoDB, Express, React, Node.js).

### Frontend (Client)
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS + Lucide React Icons
- **State & Data:** Context API, Axios for API requests
- **Real-Time:** `socket.io-client`
- **Drag & Drop:** `@dnd-kit/core`

### Backend (Server)
- **Framework:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Real-Time:** Socket.io
- **Auth:** JWT, bcryptjs, cookie-parser
- **Security:** Helmet, express-rate-limit, cors
- **File Uploads:** Multer (local disk storage)

## Project Structure

```text
TaskFlow/
├── client/                 # Frontend React Application
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── api/            # Axios client and socket setup
│   │   ├── components/     # UI components (Buttons, Modals, Cards)
│   │   ├── context/        # React Context (AuthContext)
│   │   ├── pages/          # Full page views (Board, Dashboard, Login)
│   │   └── index.css       # Tailwind entry
│   └── vite.config.js      # Vite configuration
│
├── server/                 # Backend Node.js Application
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, RBAC, Error Handling, Uploads
│   │   ├── models/         # Mongoose Schemas
│   │   ├── routes/         # Express Router definitions
│   │   └── socket.js       # Socket.io event handlers
│   ├── test-*.js           # Automated integration test suites
│   └── server.js           # Express app entry point
│
└── docs/                   # Original Planning & Spec Documents
```

## Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (Local instance or Atlas Cluster)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/taskflow.git
cd taskflow
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
```
Fill in the `.env` file with your credentials:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/taskflow
MONGODB_TEST_URI=mongodb://localhost:27017/taskflow_test
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
CORS_ORIGIN=http://localhost:5173
```
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../client
npm install
cp .env.example .env
```
Ensure your `.env` points to the backend:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```
Start the frontend dev server:
```bash
npm run dev
```

## APIs & Socket.io

### REST API Structure
- `/api/auth` - Login, Register, Refresh, Logout
- `/api/users` - User context and Dashboard aggregation
- `/api/boards` - Board CRUD, Member management
- `/api/boards/:boardId/tasks` - Task CRUD, Reordering, Filters
- `/api/boards/:boardId/tasks/:taskId/comments` - Task discussion
- `/api/boards/:boardId/tasks/:taskId/attachments` - File uploads
- `/api/boards/:boardId/activity` - Audit logs

### Socket.io Events
- **Auth:** Connections require JWT authentication via handshake.
- **Rooms:** Users join specific `board:<id>` rooms.
- **Emits:** `task_created`, `task_moved`, `task_updated`, `member_added`, `comment_created`, `presence_update`, etc.

## Security & Testing

The platform has been hardened against common web vulnerabilities (Phase 15 Security Hardening).
- **Rate Limiting:** Global (300/15m), Auth (20/15m), Uploads (30/15m).
- **Injection Prevention:** Strict query parameter sanitization (e.g. escaping regex, blocking `$ne` objects).
- **IDOR Prevention:** Board-boundary isolation strictly enforced at the middleware and controller level.
- **Payload Limits:** 50KB request bodies to prevent memory exhaustion.

### Running Tests
The backend contains comprehensive automated integration tests using `supertest`.
```bash
cd server
# Run all test suites
node test-auth.js
node test-rbac.js
node test-boards.js
node test-tasks.js
node test-comments-attachments.js
node test-activity.js
node test-socket.js
node test-user.js
node test-security.js
```

## Remaining Technical Debt

- **File Storage:** Attachments currently use local disk storage (`server/uploads/`). This limits horizontal scaling. For a multi-instance production environment, this must be migrated to AWS S3 or Cloudinary.
- **Refresh Token Revocation:** Refresh tokens rotate on use, but the server does not hold a persisted token allowlist. A leaked refresh token remains valid until expiry.
- **Frontend Bundle Size:** The React frontend compiles to ~505KB. Future iterations should implement route-based code splitting using `React.lazy()` to reduce initial load times.
- **Mock Pages:** Some settings/profile modification pages in the frontend mock the UI state (e.g., Password Reset, Profile Update) and require backend integration.

## How I Used AI

This project was built iteratively using an advanced agentic coding workflow. I used AI as a comprehensive pair programmer to:
- **Architecture & Scoping:** The AI helped draft the PRD, Technical Specifications, and UI/UX Specifications to ensure a scalable MERN foundation.
- **Iterative Implementation:** Following a structured 16-phase Development Plan, the AI generated models, controllers, and React components sequentially, verifying each step.
- **Security Hardening:** The AI performed a dedicated security audit (Phase 15), identifying and patching MongoDB operator injections, missing rate limiters, missing security headers, and excessive payload sizes.
- **Automated Testing:** The AI generated 9 distinct integration test suites (over 100+ test cases) to validate RBAC, authentication, and IDOR protection.
- **Debugging:** When tests failed or the frontend desynced, the AI traced the issue through the stack, from reading server logs to patching specific Mongoose validation schemas or React state loops.
