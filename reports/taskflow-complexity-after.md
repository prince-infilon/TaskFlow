# TaskFlow Complexity & Performance — After

**Benchmark date:** 2026-10-23 (UTC)  
**Runs:** five  
**Implementation measured:** same working tree and test procedure as the baseline, after the focused task-edit UI fix

## Changes in the measured implementation

In [Board.jsx](../client/src/pages/Board.jsx), the task-update socket handler was already used inside the socket effect but was also called from the component-level Save handler, where it was out of scope. The component now retains the current handler in a ref, uses that same handler for the API response, and clears the ref during socket-effect cleanup. The fallback fetch/update path remains available if the socket handler is not yet installed. This restores the intended save flow without changing API contracts, authorization, or task algorithms.

No performance optimization was made: the five-run baseline did not identify a sufficiently consistent performance bottleneck to justify speculative changes. This is a functional fix required to complete the requested workflow.

## Test environment and method

The five after runs used the same local URLs, Node/Playwright/Chromium versions, viewport, test account, UI-driven workflow, health-memory sampling, unique test board/task approach, and confirmation-based cleanup as the before runs. The baseline report documents the setup and the [runner](../scripts/taskflow-complexity-benchmark.cjs). Each created test task and board was deleted through the application UI in every run.

## Workflow benchmark

All five after runs passed all twelve workflow checks, including verifying the edited task title/description, deleting the task, and deleting the newly created board.

| Operation | Runs | Average (ms) | Median (ms) | Min–max (ms) |
|---|---:|---:|---:|---:|
| Open landing page | 5/5 | 1,529.63 | 1,423.32 | 1,349.12–1,875.96 |
| Navigate to login | 5/5 | 234.23 | 229.85 | 156.87–327.79 |
| Log in | 5/5 | 533.63 | 486.69 | 436.94–727.12 |
| Load dashboard | 5/5 | 328.81 | 297.86 | 285.24–422.83 |
| Navigate to boards | 5/5 | 530.49 | 517.80 | 453.28–655.59 |
| Create test board | 5/5 | 766.28 | 675.94 | 652.49–1,025.68 |
| Open test board | 5/5 | 1,090.24 | 1,077.19 | 979.22–1,251.84 |
| Create test task | 5/5 | 942.31 | 875.89 | 810.34–1,257.19 |
| Open test task | 5/5 | 289.55 | 298.02 | 216.52–339.95 |
| Edit and save test task | 5/5 | 1,121.77 | 1,178.34 | 890.88–1,306.53 |
| Delete test task | 5/5 | 649.92 | 640.72 | 531.44–848.16 |
| Delete test board | 5/5 | 936.04 | 968.55 | 777.26–1,011.05 |

### Per-run start/end time, duration, and outcome

All timestamps are UTC.

| Run | Operation | Started (UTC) | Ended (UTC) | Duration (ms) | Result |
|---:|---|---|---|---:|---|
| 1 | Open landing page | 2026-10-23T08:25:20.018Z | 2026-10-23T08:25:21.894Z | 1,875.96 | Passed |
| 1 | Navigate to login | 2026-10-23T08:25:21.894Z | 2026-10-23T08:25:22.222Z | 327.79 | Passed |
| 1 | Log in | 2026-10-23T08:25:22.222Z | 2026-10-23T08:25:22.949Z | 727.12 | Passed |
| 1 | Load dashboard | 2026-10-23T08:25:22.949Z | 2026-10-23T08:25:23.372Z | 422.83 | Passed |
| 1 | Navigate to boards | 2026-10-23T08:25:23.372Z | 2026-10-23T08:25:24.027Z | 655.59 | Passed |
| 1 | Create test board | 2026-10-23T08:25:24.028Z | 2026-10-23T08:25:25.054Z | 1,025.68 | Passed |
| 1 | Open test board | 2026-10-23T08:25:25.054Z | 2026-10-23T08:25:26.306Z | 1,251.84 | Passed |
| 1 | Create test task | 2026-10-23T08:25:26.306Z | 2026-10-23T08:25:27.563Z | 1,257.19 | Passed |
| 1 | Open test task | 2026-10-23T08:25:27.563Z | 2026-10-23T08:25:27.861Z | 298.02 | Passed |
| 1 | Edit and save test task | 2026-10-23T08:25:27.861Z | 2026-10-23T08:25:29.144Z | 1,282.41 | Passed |
| 1 | Delete test task | 2026-10-23T08:25:29.144Z | 2026-10-23T08:25:29.829Z | 684.75 | Passed |
| 1 | Delete test board | 2026-10-23T08:25:29.829Z | 2026-10-23T08:25:30.814Z | 985.90 | Passed |
| 2 | Open landing page | 2026-10-23T08:25:31.148Z | 2026-10-23T08:25:32.569Z | 1,421.25 | Passed |
| 2 | Navigate to login | 2026-10-23T08:25:32.569Z | 2026-10-23T08:25:32.799Z | 229.85 | Passed |
| 2 | Log in | 2026-10-23T08:25:32.799Z | 2026-10-23T08:25:33.331Z | 531.79 | Passed |
| 2 | Load dashboard | 2026-10-23T08:25:33.331Z | 2026-10-23T08:25:33.629Z | 297.86 | Passed |
| 2 | Navigate to boards | 2026-10-23T08:25:33.629Z | 2026-10-23T08:25:34.082Z | 453.28 | Passed |
| 2 | Create test board | 2026-10-23T08:25:34.082Z | 2026-10-23T08:25:34.735Z | 652.49 | Passed |
| 2 | Open test board | 2026-10-23T08:25:34.735Z | 2026-10-23T08:25:35.831Z | 1,096.62 | Passed |
| 2 | Create test task | 2026-10-23T08:25:35.831Z | 2026-10-23T08:25:36.689Z | 857.98 | Passed |
| 2 | Open test task | 2026-10-23T08:25:36.689Z | 2026-10-23T08:25:36.952Z | 262.99 | Passed |
| 2 | Edit and save test task | 2026-10-23T08:25:36.952Z | 2026-10-23T08:25:38.131Z | 1,178.34 | Passed |
| 2 | Delete test task | 2026-10-23T08:25:38.131Z | 2026-10-23T08:25:38.979Z | 848.16 | Passed |
| 2 | Delete test board | 2026-10-23T08:25:38.979Z | 2026-10-23T08:25:39.948Z | 968.55 | Passed |
| 3 | Open landing page | 2026-10-23T08:25:40.274Z | 2026-10-23T08:25:41.698Z | 1,423.32 | Passed |
| 3 | Navigate to login | 2026-10-23T08:25:41.698Z | 2026-10-23T08:25:41.934Z | 236.83 | Passed |
| 3 | Log in | 2026-10-23T08:25:41.935Z | 2026-10-23T08:25:42.371Z | 436.94 | Passed |
| 3 | Load dashboard | 2026-10-23T08:25:42.371Z | 2026-10-23T08:25:42.667Z | 295.14 | Passed |
| 3 | Navigate to boards | 2026-10-23T08:25:42.667Z | 2026-10-23T08:25:43.164Z | 497.75 | Passed |
| 3 | Create test board | 2026-10-23T08:25:43.164Z | 2026-10-23T08:25:43.840Z | 675.94 | Passed |
| 3 | Open test board | 2026-10-23T08:25:43.840Z | 2026-10-23T08:25:44.887Z | 1,046.32 | Passed |
| 3 | Create test task | 2026-10-23T08:25:44.887Z | 2026-10-23T08:25:45.763Z | 875.89 | Passed |
| 3 | Open test task | 2026-10-23T08:25:45.763Z | 2026-10-23T08:25:46.093Z | 330.28 | Passed |
| 3 | Edit and save test task | 2026-10-23T08:25:46.093Z | 2026-10-23T08:25:47.400Z | 1,306.53 | Passed |
| 3 | Delete test task | 2026-10-23T08:25:47.400Z | 2026-10-23T08:25:48.040Z | 640.72 | Passed |
| 3 | Delete test board | 2026-10-23T08:25:48.040Z | 2026-10-23T08:25:49.051Z | 1,011.05 | Passed |
| 4 | Open landing page | 2026-10-23T08:25:49.390Z | 2026-10-23T08:25:50.968Z | 1,578.52 | Passed |
| 4 | Navigate to login | 2026-10-23T08:25:50.969Z | 2026-10-23T08:25:51.188Z | 219.81 | Passed |
| 4 | Log in | 2026-10-23T08:25:51.188Z | 2026-10-23T08:25:51.674Z | 485.62 | Passed |
| 4 | Load dashboard | 2026-10-23T08:25:51.674Z | 2026-10-23T08:25:52.017Z | 342.98 | Passed |
| 4 | Navigate to boards | 2026-10-23T08:25:52.017Z | 2026-10-23T08:25:52.535Z | 517.80 | Passed |
| 4 | Create test board | 2026-10-23T08:25:52.535Z | 2026-10-23T08:25:53.352Z | 817.51 | Passed |
| 4 | Open test board | 2026-10-23T08:25:53.352Z | 2026-10-23T08:25:54.331Z | 979.22 | Passed |
| 4 | Create test task | 2026-10-23T08:25:54.332Z | 2026-10-23T08:25:55.142Z | 810.34 | Passed |
| 4 | Open test task | 2026-10-23T08:25:55.142Z | 2026-10-23T08:25:55.482Z | 339.95 | Passed |
| 4 | Edit and save test task | 2026-10-23T08:25:55.482Z | 2026-10-23T08:25:56.433Z | 950.67 | Passed |
| 4 | Delete test task | 2026-10-23T08:25:56.433Z | 2026-10-23T08:25:56.964Z | 531.44 | Passed |
| 4 | Delete test board | 2026-10-23T08:25:56.964Z | 2026-10-23T08:25:57.902Z | 937.43 | Passed |
| 5 | Open landing page | 2026-10-23T08:25:58.466Z | 2026-10-23T08:25:59.815Z | 1,349.12 | Passed |
| 5 | Navigate to login | 2026-10-23T08:25:59.815Z | 2026-10-23T08:25:59.972Z | 156.87 | Passed |
| 5 | Log in | 2026-10-23T08:25:59.972Z | 2026-10-23T08:26:00.458Z | 486.69 | Passed |
| 5 | Load dashboard | 2026-10-23T08:26:00.459Z | 2026-10-23T08:26:00.744Z | 285.24 | Passed |
| 5 | Navigate to boards | 2026-10-23T08:26:00.744Z | 2026-10-23T08:26:01.272Z | 528.05 | Passed |
| 5 | Create test board | 2026-10-23T08:26:01.272Z | 2026-10-23T08:26:01.932Z | 659.77 | Passed |
| 5 | Open test board | 2026-10-23T08:26:01.932Z | 2026-10-23T08:26:03.009Z | 1,077.19 | Passed |
| 5 | Create test task | 2026-10-23T08:26:03.009Z | 2026-10-23T08:26:03.919Z | 910.15 | Passed |
| 5 | Open test task | 2026-10-23T08:26:03.919Z | 2026-10-23T08:26:04.136Z | 216.52 | Passed |
| 5 | Edit and save test task | 2026-10-23T08:26:04.136Z | 2026-10-23T08:26:05.027Z | 890.88 | Passed |
| 5 | Delete test task | 2026-10-23T08:26:05.027Z | 2026-10-23T08:26:05.571Z | 544.54 | Passed |
| 5 | Delete test board | 2026-10-23T08:26:05.571Z | 2026-10-23T08:26:06.349Z | 777.26 | Passed |

## API request results

Times are individual browser-observed request durations; request counts include events and page lifecycle. The two 401 responses per unauthenticated run are the app's existing refresh attempt before login.

| Request | HTTP | Count | Average (ms) | Median (ms) | Min–max (ms) |
|---|---:|---:|---:|---:|---:|
| `POST /api/auth/refresh` | 401 | 10 | 50.27 | 28.09 | 15.67–160.60 |
| `POST /api/auth/login` | 200 | 5 | 222.86 | 205.76 | 187.93–275.12 |
| `GET /api/orgs` | 200 | 5 | 87.01 | 85.72 | 77.95–97.60 |
| `GET /api/boards` | 200 | 31 | 112.44 | 103.00 | 43.58–189.31 |
| `GET /api/notifications` | 200 | 10 | 239.12 | 194.96 | 102.62–471.92 |
| `GET /api/users/me/dashboard` | 200 | 10 | 316.87 | 316.47 | 179.33–509.24 |
| `POST /api/boards` | 201 | 5 | 190.33 | 196.88 | 166.36–214.72 |
| `GET /api/boards/:id` | 200 | 10 | 120.63 | 107.52 | 68.41–235.06 |
| `GET /api/boards/:id/columns` | 200 | 10 | 137.54 | 145.45 | 78.85–192.60 |
| `GET /api/boards/:id/members` | 200 | 10 | 150.52 | 148.94 | 88.74–227.20 |
| `GET /api/boards/:id/tasks` | 200 | 15 | 103.11 | 100.17 | 68.06–171.93 |
| `POST /api/boards/:id/tasks` | 201 | 5 | 233.42 | 250.00 | 157.53–291.76 |
| `GET /api/boards/:id/tasks/:id/comments` | 200 | 5 | 163.23 | 133.35 | 116.57–293.62 |
| `GET /api/boards/:id/tasks/:id/attachments` | 200 | 5 | 195.37 | 148.93 | 106.34–460.34 |
| `PATCH /api/boards/:id/tasks/:id` | 200 | 5 | 192.86 | 162.63 | 159.08–287.28 |
| `DELETE /api/boards/:id/tasks/:id` | 200 | 5 | 270.82 | 266.67 | 186.20–350.93 |
| `DELETE /api/boards/:id` | 200 | 5 | 186.55 | 179.92 | 136.44–278.94 |

No API transport failures were observed. The only non-2xx API results were the same unauthenticated refresh 401s present before the fix; there were no new page errors.

## Time and space complexity after the fix

The fix changes how the already-existing task-update handler is referenced; it does not change the task/board algorithms, database queries, indexes, API shape, or their input-size behavior.

| Operation | Before | After | Explanation |
|---|---|---|---|
| Group tasks for a board | `O(t + c)` | `O(t + c)` | Same task-to-column grouping and page-bounded deduplication. |
| Dashboard application-side board ID mapping | `O(b)` | `O(b)` | Same `boards.map`; MongoDB query costs remain query-plan-dependent. |
| Edit task local-state update | `O(t + c)` | `O(t + c)` | The same handler maps/filters the column/task lists; only its reference is now available to the Save handler. |
| Task create/update/delete persistence | No controller-level Big-O claim | No controller-level Big-O claim | Same MongoDB, population, activity, and filesystem operations. |

| Operation | Before auxiliary space | After auxiliary space | Explanation |
|---|---:|---:|---|
| Task grouping/edit state | `O(t + c)` | `O(t + c)` | Existing temporary task/column arrays are unchanged. |
| Task-update handler reference | N/A | `O(1)` | A single ref stores the existing function reference; it does not copy tasks or board state. |
| Database and populated documents | Database/runtime-dependent | Database/runtime-dependent | No query or population behavior changed. |

No asymptotic time or space complexity changed.

## Memory observations

Rounded health-endpoint values, before → after each run:

| Run | RSS (MB) | Heap used (MB) | Heap total (MB) |
|---:|---:|---:|---:|
| 1 | 68 → 91 | 45 → 40 | 48 → 52 |
| 2 | 91 → 92 | 40 → 42 | 52 → 52 |
| 3 | 92 → 91 | 42 → 42 | 52 → 52 |
| 4 | 91 → 93 | 42 → 44 | 52 → 52 |
| 5 | 93 → 93 | 44 → 44 | 52 → 52 |

RSS/heap values are rounded process snapshots, vary with garbage collection and runtime state, and do not prove a memory-complexity change. The UI fix adds one constant-size function reference.

## Functional verification and limitations

- Login, dashboard, boards navigation, board create/open, task create/open/edit/save, task delete, and test-board delete all passed in **5/5 runs**.
- Each run's test board/task was created with a unique name and removed through the application UI. No other records were selected or deleted.
- The pre-login `/api/auth/refresh` 401 and browser resource errors remain unchanged; they are part of the existing unauthenticated startup behavior. No new failed API requests or page errors appeared.
- Frontend `npm --prefix client run build` passed. `npm --prefix client run lint` exited successfully with existing warnings; there are no client/server test/spec files under those directories.
- This is a local, single-user benchmark with small test fixtures, not a concurrent load test. Small timing changes can reflect warm caches, browser scheduling, and process state. The baseline edit/save operation failed, so no truthful before/after percentage can be calculated for that operation.
