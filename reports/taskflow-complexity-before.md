# TaskFlow Complexity & Performance — Before

**Benchmark date:** 2026-10-23 (UTC)  
**Implementation measured:** the existing working tree before application-code changes  
**Runs:** five

## Architecture and code reviewed

The project is a React 19/Vite client and an Express/Node.js API backed by Mongoose/MongoDB. Authentication and organization/board authorization are middleware-protected. The reviewed surfaces included the router and page setup, login/auth context, dashboard and boards pages, the 2,311-line board page, board/task routes and controllers, authorization middleware, relevant Mongoose models/indexes, and activity/notification services.

This repository already had uncommitted changes when the assessment began, including [Board.jsx](../client/src/pages/Board.jsx), [boardController.js](../server/src/controllers/boardController.js), and other UI/controller files. No existing edits were reverted. These results describe that working tree, not a pristine checkout.

## Test environment and method

- Windows local development environment; frontend `http://localhost:5173`, backend `http://localhost:5000`.
- Node.js `v24.13.0`; Playwright `1.64.1` with headless Chromium, 1440 × 900 viewport.
- MongoDB was connected; `/api/health` reported a healthy database. The backend uses its configured local MongoDB URI (the URI and credentials are intentionally omitted).
- Five fresh browser contexts, one uniquely named board and task per run, created and deleted using the application UI. The script does not call task/board APIs to create or remove fixtures.
- Each UI step was timed from action start until the associated page/modal/content condition was met. API request elapsed time was recorded separately from browser request start to finish, with HTTP status. `GET /api/health` memory samples were taken before and after each run.
- The repeatable runner is [taskflow-complexity-benchmark.cjs](../scripts/taskflow-complexity-benchmark.cjs). It reads test credentials from environment variables and never writes them to its result data.
- To repeat on Windows, start the local client/server, set `TASKFLOW_TEST_EMAIL`, `TASKFLOW_TEST_PASSWORD`, and `TASKFLOW_BENCHMARK_RUNS=5`, then run `node .\scripts\taskflow-complexity-benchmark.cjs .\reports\taskflow-benchmark.json`. Change `TASKFLOW_BENCHMARK_LABEL` to use a different unique fixture prefix.
- The start/end timestamps below are UTC. UI timings include browser interaction/rendering and may include more than one API call; API timings are per individual request.

## Workflow results

All five runs opened the landing page, navigated to login, logged in, loaded the dashboard, navigated to boards, created/opened a board, created/opened a task, and performed the task-update request. The task update **did not complete successfully in the UI**; see the error and limitation below. The test task and its test board were still explicitly deleted through the UI in every run.

### Per-operation average and median

Successful counts are shown so failed operations are not represented as successful latency measurements. For the edit operation, the displayed average/median are only elapsed times to the observed failure.

| Operation | Successful runs | Average (ms) | Median (ms) | Failed runs |
|---|---:|---:|---:|---:|
| Open landing page | 5/5 | 1,594.65 | 1,591.75 | 0 |
| Navigate to login | 5/5 | 212.17 | 200.85 | 0 |
| Log in | 5/5 | 562.75 | 560.04 | 0 |
| Load dashboard | 5/5 | 345.99 | 351.68 | 0 |
| Navigate to boards | 5/5 | 562.20 | 566.48 | 0 |
| Create test board | 5/5 | 863.64 | 740.74 | 0 |
| Open test board | 5/5 | 974.43 | 998.59 | 0 |
| Create test task | 5/5 | 1,044.91 | 912.73 | 0 |
| Open test task | 5/5 | 308.16 | 298.36 | 0 |
| Edit and save test task | 0/5 | 1,109.39* | 1,109.54* | 5 |
| Delete test task | 5/5 | 652.72 | 674.61 | 0 |
| Delete test board | 5/5 | 916.58 | 842.34 | 0 |

\* Failure latency, not a successful save duration. The associated `PATCH` returned HTTP 200, but the UI displayed `handleTaskUpdated is not defined` and kept the edit modal open.

### Per-run start/end time, duration, and outcome

| Run | Operation | Started (UTC) | Ended (UTC) | Duration (ms) | Result |
|---:|---|---|---|---:|---|
| 1 | Open landing page | 2026-10-23T08:18:53.945Z | 2026-10-23T08:18:56.064Z | 2,118.27 | Passed |
| 1 | Navigate to login | 2026-10-23T08:18:56.064Z | 2026-10-23T08:18:56.317Z | 253.28 | Passed |
| 1 | Log in | 2026-10-23T08:18:56.317Z | 2026-10-23T08:18:56.877Z | 560.04 | Passed |
| 1 | Load dashboard | 2026-10-23T08:18:56.877Z | 2026-10-23T08:18:57.282Z | 404.91 | Passed |
| 1 | Navigate to boards | 2026-10-23T08:18:57.282Z | 2026-10-23T08:18:57.849Z | 566.48 | Passed |
| 1 | Create test board | 2026-10-23T08:18:57.849Z | 2026-10-23T08:18:58.668Z | 819.22 | Passed |
| 1 | Open test board | 2026-10-23T08:18:58.668Z | 2026-10-23T08:18:59.719Z | 1,050.74 | Passed |
| 1 | Create test task | 2026-10-23T08:18:59.719Z | 2026-10-23T08:19:00.916Z | 1,196.99 | Passed |
| 1 | Open test task | 2026-10-23T08:19:00.916Z | 2026-10-23T08:19:01.214Z | 298.36 | Passed |
| 1 | Edit and save test task | 2026-10-23T08:19:01.214Z | 2026-10-23T08:19:02.411Z | 1,196.47 | Failed |
| 1 | Delete test task | 2026-10-23T08:19:02.633Z | 2026-10-23T08:19:03.349Z | 715.68 | Passed |
| 1 | Delete test board | 2026-10-23T08:19:03.349Z | 2026-10-23T08:19:04.453Z | 1,103.92 | Passed |
| 2 | Open landing page | 2026-10-23T08:19:04.814Z | 2026-10-23T08:19:06.405Z | 1,591.75 | Passed |
| 2 | Navigate to login | 2026-10-23T08:19:06.406Z | 2026-10-23T08:19:06.607Z | 200.85 | Passed |
| 2 | Log in | 2026-10-23T08:19:06.607Z | 2026-10-23T08:19:07.171Z | 564.24 | Passed |
| 2 | Load dashboard | 2026-10-23T08:19:07.171Z | 2026-10-23T08:19:07.523Z | 351.68 | Passed |
| 2 | Navigate to boards | 2026-10-23T08:19:07.523Z | 2026-10-23T08:19:08.068Z | 545.86 | Passed |
| 2 | Create test board | 2026-10-23T08:19:08.068Z | 2026-10-23T08:19:09.429Z | 1,360.60 | Passed |
| 2 | Open test board | 2026-10-23T08:19:09.429Z | 2026-10-23T08:19:10.268Z | 838.63 | Passed |
| 2 | Create test task | 2026-10-23T08:19:10.268Z | 2026-10-23T08:19:11.723Z | 1,455.05 | Passed |
| 2 | Open test task | 2026-10-23T08:19:11.723Z | 2026-10-23T08:19:12.189Z | 466.10 | Passed |
| 2 | Edit and save test task | 2026-10-23T08:19:12.189Z | 2026-10-23T08:19:13.525Z | 1,335.77 | Failed |
| 2 | Delete test task | 2026-10-23T08:19:13.749Z | 2026-10-23T08:19:14.452Z | 702.53 | Passed |
| 2 | Delete test board | 2026-10-23T08:19:14.452Z | 2026-10-23T08:19:15.294Z | 842.34 | Passed |
| 3 | Open landing page | 2026-10-23T08:19:15.601Z | 2026-10-23T08:19:17.222Z | 1,620.60 | Passed |
| 3 | Navigate to login | 2026-10-23T08:19:17.222Z | 2026-10-23T08:19:17.476Z | 254.08 | Passed |
| 3 | Log in | 2026-10-23T08:19:17.476Z | 2026-10-23T08:19:18.137Z | 661.46 | Passed |
| 3 | Load dashboard | 2026-10-23T08:19:18.137Z | 2026-10-23T08:19:18.496Z | 358.76 | Passed |
| 3 | Navigate to boards | 2026-10-23T08:19:18.496Z | 2026-10-23T08:19:19.108Z | 612.21 | Passed |
| 3 | Create test board | 2026-10-23T08:19:19.109Z | 2026-10-23T08:19:19.816Z | 707.51 | Passed |
| 3 | Open test board | 2026-10-23T08:19:19.816Z | 2026-10-23T08:19:20.818Z | 1,001.33 | Passed |
| 3 | Create test task | 2026-10-23T08:19:20.818Z | 2026-10-23T08:19:21.712Z | 894.13 | Passed |
| 3 | Open test task | 2026-10-23T08:19:21.712Z | 2026-10-23T08:19:22.013Z | 300.70 | Passed |
| 3 | Edit and save test task | 2026-10-23T08:19:22.013Z | 2026-10-23T08:19:23.122Z | 1,109.54 | Failed |
| 3 | Delete test task | 2026-10-23T08:19:23.299Z | 2026-10-23T08:19:23.974Z | 674.61 | Passed |
| 3 | Delete test board | 2026-10-23T08:19:23.974Z | 2026-10-23T08:19:25.013Z | 1,039.03 | Passed |
| 4 | Open landing page | 2026-10-23T08:19:25.313Z | 2026-10-23T08:19:26.660Z | 1,346.45 | Passed |
| 4 | Navigate to login | 2026-10-23T08:19:26.660Z | 2026-10-23T08:19:26.838Z | 178.50 | Passed |
| 4 | Log in | 2026-10-23T08:19:26.838Z | 2026-10-23T08:19:27.334Z | 495.64 | Passed |
| 4 | Load dashboard | 2026-10-23T08:19:27.334Z | 2026-10-23T08:19:27.649Z | 314.92 | Passed |
| 4 | Navigate to boards | 2026-10-23T08:19:27.649Z | 2026-10-23T08:19:28.303Z | 654.11 | Passed |
| 4 | Create test board | 2026-10-23T08:19:28.303Z | 2026-10-23T08:19:28.993Z | 690.15 | Passed |
| 4 | Open test board | 2026-10-23T08:19:28.993Z | 2026-10-23T08:19:29.976Z | 982.85 | Passed |
| 4 | Create test task | 2026-10-23T08:19:29.976Z | 2026-10-23T08:19:30.742Z | 765.67 | Passed |
| 4 | Open test task | 2026-10-23T08:19:30.742Z | 2026-10-23T08:19:30.984Z | 242.29 | Passed |
| 4 | Edit and save test task | 2026-10-23T08:19:30.984Z | 2026-10-23T08:19:31.888Z | 903.29 | Failed |
| 4 | Delete test task | 2026-10-23T08:19:32.054Z | 2026-10-23T08:19:32.652Z | 598.08 | Passed |
| 4 | Delete test board | 2026-10-23T08:19:32.652Z | 2026-10-23T08:19:33.421Z | 769.24 | Passed |
| 5 | Open landing page | 2026-10-23T08:19:33.756Z | 2026-10-23T08:19:35.052Z | 1,296.17 | Passed |
| 5 | Navigate to login | 2026-10-23T08:19:35.052Z | 2026-10-23T08:19:35.226Z | 174.15 | Passed |
| 5 | Log in | 2026-10-23T08:19:35.226Z | 2026-10-23T08:19:35.759Z | 532.36 | Passed |
| 5 | Load dashboard | 2026-10-23T08:19:35.759Z | 2026-10-23T08:19:36.058Z | 299.68 | Passed |
| 5 | Navigate to boards | 2026-10-23T08:19:36.058Z | 2026-10-23T08:19:36.491Z | 432.36 | Passed |
| 5 | Create test board | 2026-10-23T08:19:36.491Z | 2026-10-23T08:19:37.231Z | 740.74 | Passed |
| 5 | Open test board | 2026-10-23T08:19:37.232Z | 2026-10-23T08:19:38.230Z | 998.59 | Passed |
| 5 | Create test task | 2026-10-23T08:19:38.230Z | 2026-10-23T08:19:39.143Z | 912.73 | Passed |
| 5 | Open test task | 2026-10-23T08:19:39.143Z | 2026-10-23T08:19:39.376Z | 233.34 | Passed |
| 5 | Edit and save test task | 2026-10-23T08:19:39.376Z | 2026-10-23T08:19:40.378Z | 1,001.88 | Failed |
| 5 | Delete test task | 2026-10-23T08:19:40.531Z | 2026-10-23T08:19:41.103Z | 572.70 | Passed |
| 5 | Delete test board | 2026-10-23T08:19:41.103Z | 2026-10-23T08:19:41.932Z | 828.35 | Passed |

## API request results

Elapsed time is browser-observed request start to finish. Counts include calls triggered by page initialization, route changes, and the app's existing socket/event refresh behavior; repeated calls are not treated as separate algorithmic work without source evidence. Dynamic IDs are redacted.

| Request | HTTP | Count | Average (ms) | Median (ms) | Min–max (ms) |
|---|---:|---:|---:|---:|---:|
| `POST /api/auth/refresh` | 401 | 10 | 40.23 | 33.72 | 22.65–77.20 |
| `POST /api/auth/login` | 200 | 5 | 260.04 | 238.88 | 221.97–361.39 |
| `GET /api/orgs` | 200 | 5 | 102.03 | 102.64 | 94.39–110.85 |
| `GET /api/boards` | 200 | 30 | 138.70 | 105.86 | 59.86–377.70 |
| `GET /api/notifications` | 200 | 10 | 282.75 | 270.38 | 133.08–489.16 |
| `GET /api/users/me/dashboard` | 200 | 10 | 321.75 | 322.17 | 188.44–448.31 |
| `POST /api/boards` | 201 | 5 | 223.87 | 228.58 | 200.84–243.13 |
| `GET /api/boards/:id` | 200 | 10 | 120.87 | 127.93 | 56.29–187.80 |
| `GET /api/boards/:id/columns` | 200 | 10 | 146.60 | 132.76 | 94.87–241.04 |
| `GET /api/boards/:id/members` | 200 | 10 | 167.75 | 169.01 | 101.77–247.91 |
| `GET /api/boards/:id/tasks` | 200 | 15 | 131.93 | 113.68 | 91.75–268.27 |
| `POST /api/boards/:id/tasks` | 201 | 5 | 243.95 | 226.62 | 204.54–346.41 |
| `GET /api/boards/:id/tasks/:id/attachments` | 200 | 5 | 129.87 | 133.30 | 101.56–159.83 |
| `GET /api/boards/:id/tasks/:id/comments` | 200 | 5 | 163.62 | 159.42 | 129.67–200.97 |
| `PATCH /api/boards/:id/tasks/:id` | 200 | 5 | 269.85 | 265.80 | 198.72–365.17 |
| `DELETE /api/boards/:id/tasks/:id` | 200 | 5 | 291.93 | 304.52 | 235.99–328.45 |
| `DELETE /api/boards/:id` | 200 | 5 | 209.46 | 214.82 | 190.19–224.22 |

There were no transport-level failed API requests. The ten 401 refresh responses occurred before login in the fresh, unauthenticated contexts. The browser reported those 401 resources; no uncaught page errors were recorded. Separately, the edit dialog displayed the JavaScript `ReferenceError` described below.

## Time complexity applicable to the inspected code

Here, `t` is the number of task records processed, `p` the returned page size (the API caps it at 100), `c` the number of board columns, `b` the boards loaded for a user, `m` the board-member count, and `a` the attachment count. Database costs are identified separately: Big-O for a MongoDB query cannot be inferred from a controller call alone.

| Operation | Existing code/location | Input size | Time complexity / database qualification |
|---|---|---:|---|
| Group tasks into columns for display | [Board.jsx](../client/src/pages/Board.jsx#L376) | `t` tasks and `c` columns | `O(t + c)` per grouping pass: task records are traversed to group them, then columns are mapped. Load-more deduplication uses a `Set`, expected `O(t + p)`. |
| Render board/task cards | [Boards.jsx](../client/src/pages/Boards.jsx#L100), [Board.jsx](../client/src/pages/Board.jsx#L70) | `b` boards / `p` visible tasks | `O(b)` / `O(p)` React element creation for the rendered lists; browser layout/paint cost is separate. |
| List tasks for a board | [taskController.js](../server/src/controllers/taskController.js#L14) | Filtered collection size, page `p ≤ 100` | MongoDB filter, sort, skip, limit, count, and Mongoose population are database/query-plan work, not a defensible controller-level `O(t)` claim. The task indexes include board/column/position and board/assignee ([Task.js](../server/src/models/Task.js#L61)). |
| Create task | [taskController.js](../server/src/controllers/taskController.js#L106) | `m` board members if assigning; otherwise constant app-side work | Optional `members.find` is `O(m)`. Column/task reads, save, activity write, and populated read are database operations; latency depends on storage, indexes, population, and network. |
| Edit task fields | [taskController.js](../server/src/controllers/taskController.js#L220) | `k` submitted fields and optionally `m` members | Iterating the submitted fields is `O(k)`; optional member lookup is `O(m)`. Persistence and populate costs are DB-dependent. |
| Delete task and clean attachments | [taskController.js](../server/src/controllers/taskController.js#L326) | `a` attachment records | The attachment loop is `O(a)` application operations, with sequential filesystem unlink calls; database delete operations are separate. |
| Dashboard aggregation | [userController.js](../server/src/controllers/userController.js#L5) | `b` boards | `boards.map` is `O(b)`. The task count/recent-task/activity queries are database operations. They are awaited sequentially in this implementation; their per-query complexity depends on MongoDB indexes and plans. |
| My Tasks filtering and pagination | [userController.js](../server/src/controllers/userController.js#L60) | `t` matching tasks | Database retrieval/sort is query-plan-dependent. The returned set is filtered twice and then sliced in application code, `O(t)` time; the endpoint currently loads all matching tasks before applying page slicing. This path is outside the measured workflow and was not changed. |
| Drag-over state copy | [Board.jsx](../client/src/pages/Board.jsx#L918) | `t` tasks and `c` columns | JSON stringify/parse clones the whole state (`O(t + c)` time and temporary space); the array searches/reordering add linear scans. This only runs during drag interactions, which the requested benchmark did not exercise. |

## Space complexity applicable to the inspected code

These are auxiliary-space observations, not estimates of total browser/server memory.

| Operation | Existing code/location | Additional space | Explanation |
|---|---|---:|---|
| Board task grouping and load-more merge | [Board.jsx](../client/src/pages/Board.jsx#L416) | `O(t + c)` | `allTasks`, the per-column `Map`/arrays, and mapped task card objects scale with retained tasks and columns; the dedupe `Set` is `O(t + p)` on load-more. |
| Task-list response | [taskController.js](../server/src/controllers/taskController.js#L81) | Up to `O(p)` app-side result handling | The returned task page is capped at `p ≤ 100`; MongoDB working memory, query plans, and network buffers are outside this auxiliary-space estimate. |
| Create/edit controller | [taskController.js](../server/src/controllers/taskController.js#L142) | `O(1)` controller-created data per task, excluding referenced/populated documents | The controller constructs one task object; Mongoose document and population memory depends on document size and references. |
| Task deletion | [taskController.js](../server/src/controllers/taskController.js#L326) | `O(a)` | `Attachment.find` materializes matching attachment documents before iterating. Filesystem and database runtime memory are separate. |
| My Tasks pagination | [userController.js](../server/src/controllers/userController.js#L68) | `O(t)` | `allTasks`, `validTasks`, and orphan-id processing coexist in application memory; pagination slicing occurs after retrieval. |
| Drag-over state copy | [Board.jsx](../client/src/pages/Board.jsx#L918) | `O(t + c)` | The JSON clone temporarily duplicates the board/column/task state. |

No recursion or unbounded call-stack growth was found in the measured workflow. The application's total memory cannot be assigned one Big-O bound from these local measurements.

## Memory observations

The health endpoint reports rounded Node process RSS and heap values. MongoDB stayed connected. Each sample is before → after the associated run.

| Run | RSS (MB) | Heap used (MB) | Heap total (MB) |
|---:|---:|---:|---:|
| 1 | 73 → 74 | 42 → 44 | 48 → 51 |
| 2 | 74 → 91 | 44 → 41 | 51 → 51 |
| 3 | 91 → 91 | 41 → 42 | 51 → 49 |
| 4 | 91 → 92 | 42 → 43 | 49 → 51 |
| 5 | 92 → 93 | 43 → 45 | 51 → 51 |

RSS rose by 20 MB across the approximately 49-second series while heap-used varied by only a few rounded MB. The process was warm and no forced garbage collection was used. These values are noisy runtime snapshots, not evidence of a leak or an asymptotic space bound.

## Bottlenecks, errors, and limitations

- **Task edit/save is the baseline functional blocker.** The `handleTaskUpdated` function is declared inside the socket `useEffect` ([Board.jsx](../client/src/pages/Board.jsx#L544)), but the component-level edit handler calls it at [Board.jsx](../client/src/pages/Board.jsx#L1057), where it is out of scope. All five task `PATCH` requests returned HTTP 200, but all five UI saves failed with `handleTaskUpdated is not defined`. This is a functional defect, not an algorithmic bottleneck. The task and board deletions still passed.
- The landing-page UI median was 1.59 s, board open 0.999 s, and task create 0.913 s. The corresponding API medians were generally 0.10–0.30 s. No endpoint showed a consistent, clearly dominant performance problem in these five clean runs; the slowest UI run was the initial landing-page run at 2.12 s.
- `/api/boards` and dashboard calls occur multiple times per workflow because the existing application fetches data on mount, route changes, and socket events. The request counts are included as observed; they do not alone establish redundant work or justify removing real-time updates.
- The test account had pre-existing project data; test fixtures were uniquely named and limited to one board and task per run. Each fixture was deleted through the UI, and no pre-existing board/task was selected for deletion.
- The local single-user run is not an isolated production load test. Existing database size, process scheduling, warm caches, and background app traffic can affect timing. Browser step durations and API request durations are not interchangeable.
- No app test/spec files were found under `client` or `server`. The baseline run is functionally **failed** for edit/save, despite the API PATCH being successful. This report records that failure instead of claiming the full workflow passed.

## Optimization decision

The measured API and UI latencies do not justify a speculative algorithm, index, cache, or concurrency change. Preserve the existing task grouping and database indexes. The task-edit scope defect must be fixed to verify the requested workflow, but it is not a performance optimization. Any performance claim will be based on the same five-run workflow after that surgical fix; if no measured performance change results, the final report will say so.
