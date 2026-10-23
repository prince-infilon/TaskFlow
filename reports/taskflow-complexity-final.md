# TaskFlow Time/Space Complexity & Performance — Final Comparison

## A. Executive Summary

The existing local TaskFlow application was exercised through its real UI with Playwright for five before runs and five after runs. Each run opened the landing page, logged in, loaded the dashboard and boards, created/opened a unique board and task, edited/saved the task, then deleted only the test task and test board.

The baseline exposed an existing task-edit UI bug: the task update API returned HTTP 200, but the save handler then failed with `handleTaskUpdated is not defined`. A small frontend fix made the existing socket update handler available to the Save handler. After that change the complete workflow passed all five after runs.

The measured API timings did not show a consistent, material backend performance bottleneck. No speculative query, indexing, caching, or algorithm changes were made. The fix is functional, not a performance optimization: there is no proven runtime or Big-O gain attributable to it.

## B. Before vs. After Benchmark

UI elapsed time includes the Playwright action and waiting for the expected UI state. Improvement is calculated from medians as `((before median - after median) / before median) * 100`. For task edit/save, no before percentage is given because the baseline failed in all five runs.

| Operation | Before Average (ms) | Before Median (ms) | After Average (ms) | After Median (ms) | Improvement (%) |
|---|---:|---:|---:|---:|---:|
| Open landing page | 1,594.65 | 1,591.75 | 1,529.63 | 1,423.32 | 10.58 |
| Navigate to login | 212.17 | 200.85 | 234.23 | 229.85 | -14.44 |
| Log in | 562.75 | 560.04 | 533.63 | 486.69 | 13.10 |
| Load dashboard | 345.99 | 351.68 | 328.81 | 297.86 | 15.30 |
| Navigate to boards | 562.20 | 566.48 | 530.49 | 517.80 | 8.59 |
| Create test board | 863.64 | 740.74 | 766.28 | 675.94 | 8.75 |
| Open test board | 974.43 | 998.59 | 1,090.24 | 1,077.19 | -7.87 |
| Create test task | 1,044.91 | 912.73 | 942.31 | 875.89 | 4.04 |
| Open test task | 308.16 | 298.36 | 289.55 | 298.02 | 0.11 |
| Edit and save test task | Failed 5/5; failure median 1,109.54 | N/A | 1,121.77 | 1,178.34 | N/A |
| Delete test task | 652.72 | 674.61 | 649.92 | 640.72 | 5.02 |
| Delete test board | 916.58 | 842.34 | 936.04 | 968.55 | -14.98 |

The before/after timing differences for operations other than edit/save are observational and noisy, not evidence that the functional fix accelerated them. Three comparable operations had slower after medians (login navigation, board open, board delete); the others had lower medians. The fastest and slowest median shifts are not supported by a changed algorithm.

Full per-run timestamps, durations, and outcomes are in [taskflow-complexity-before.md](./taskflow-complexity-before.md) and [taskflow-complexity-after.md](./taskflow-complexity-after.md).

## C. Time Complexity Comparison

Let `t` be tasks processed, `p` the returned page (`p ≤ 100`), `c` columns, `b` user boards, `m` board members, and `a` attachments.

| Operation | Before Complexity | After Complexity | What Changed? |
|---|---|---|---|
| Group board tasks for display | `O(t + c)` | `O(t + c)` | No change; same task grouping, map, and page deduplication. |
| Dashboard board-ID mapping | `O(b)` | `O(b)` | No change; MongoDB query costs remain query-plan-dependent. |
| Task create/edit/delete controller work | App-side loops are limited to `O(m)`, `O(k)`, or `O(a)` where applicable; database costs are query-plan-dependent | Same | No server/controller change. |
| Task update local-state handling | `O(t + c)` | `O(t + c)` | Same handler maps/filter task and column arrays; a ref now makes it callable by the Save handler. |
| Drag-over board-state copy | `O(t + c)` | `O(t + c)` | No change; full JSON clone and linear searches remain outside this workflow. |

No Big-O time complexity changed. MongoDB query latency is not assigned a controller-level Big-O bound: actual work depends on indexes, query planner, data size, and population behavior. Existing task/board/activity indexes were inspected; none were added.

## D. Space Complexity Comparison

| Operation | Before Auxiliary Space | After Auxiliary Space | What Changed? |
|---|---:|---:|---|
| Task grouping and load-more merge | `O(t + c)` | `O(t + c)` | No change to the arrays, Map, or Set. |
| Task edit local-state update | `O(t + c)` | `O(t + c)` | Same temporary copied column/task arrays. |
| New task-update handler ref | N/A | `O(1)` | One reference to the existing handler; no task/board copy. |
| Task deletion attachments | `O(a)` | `O(a)` | No change; matching attachments are materialized before deletion. |
| My Tasks list | `O(t)` | `O(t)` | No change; still loads matching tasks before app-side filtering/pagination. |

These are algorithmic auxiliary-space estimates. They do not describe total browser/server memory, MongoDB working memory, network buffers, or process-level RSS.

## E. Memory and API Results

### API measurements

Durations are browser-observed request elapsed times. GET counts include app lifecycle, route, and socket/event-triggered requests. Dynamic IDs are redacted.

| API request | HTTP | Before count; avg / median (ms) | After count; avg / median (ms) |
|---|---:|---:|---:|
| `POST /api/auth/refresh` | 401 | 10; 40.23 / 33.72 | 10; 50.27 / 28.09 |
| `POST /api/auth/login` | 200 | 5; 260.04 / 238.88 | 5; 222.86 / 205.76 |
| `GET /api/boards` | 200 | 30; 138.70 / 105.86 | 31; 112.44 / 103.00 |
| `GET /api/users/me/dashboard` | 200 | 10; 321.75 / 322.17 | 10; 316.87 / 316.47 |
| `POST /api/boards` | 201 | 5; 223.87 / 228.58 | 5; 190.33 / 196.88 |
| `GET /api/boards/:id/tasks` | 200 | 15; 131.93 / 113.68 | 15; 103.11 / 100.17 |
| `POST /api/boards/:id/tasks` | 201 | 5; 243.95 / 226.62 | 5; 233.42 / 250.00 |
| `PATCH /api/boards/:id/tasks/:id` | 200 | 5; 269.85 / 265.80 | 5; 192.86 / 162.63 |
| `DELETE /api/boards/:id/tasks/:id` | 200 | 5; 291.93 / 304.52 | 5; 270.82 / 266.67 |
| `DELETE /api/boards/:id` | 200 | 5; 209.46 / 214.82 | 5; 186.55 / 179.92 |

The before task `PATCH` succeeded at the API layer even though the UI reported a JavaScript error. The API handler/server code was not changed, so request-time differences should not be credited to the frontend ref fix. The only 401s in either pass were the app's unauthenticated refresh attempts before login; no transport-level failed API requests occurred.

### Node memory observations

The `/api/health` endpoint reports rounded RSS/heap values, sampled before and after each run:

| Pass | RSS before → after (MB) | Heap used before → after (MB) |
|---|---|---|
| Before, runs 1–5 | 73→74; 74→91; 91→91; 91→92; 92→93 | 42→44; 44→41; 41→42; 42→43; 43→45 |
| After, runs 1–5 | 68→91; 91→92; 92→91; 91→93; 93→93 | 45→40; 40→42; 42→42; 42→44; 44→44 |

These snapshots vary with runtime/garbage collection and do not indicate an algorithmic memory change or establish a leak. No forced GC was used.

## F. Changes Made

| File | Reason | Observed impact |
|---|---|---|
| [Board.jsx](../client/src/pages/Board.jsx) | Retain the existing socket task-update handler in a ref so the component-level task Save handler can invoke it safely; clear the ref on effect cleanup. | The UI no longer displays `handleTaskUpdated is not defined`; edited values appear and save passes 5/5. No performance or Big-O improvement was established. |
| [taskflow-complexity-benchmark.cjs](../scripts/taskflow-complexity-benchmark.cjs) | Add repeatable real-UI Playwright coverage, unique test fixture naming, timing/API/error/memory capture, and UI cleanup. | Enabled five controlled baseline attempts and five post-fix runs without exposing credentials or bypassing UI behavior. |
| [taskflow-complexity-before.md](./taskflow-complexity-before.md) | Record original source analysis and measurements before application code changed. | Baseline findings and failures preserved. |
| [taskflow-complexity-after.md](./taskflow-complexity-after.md) | Record post-fix measurements. | After results and workflow outcomes preserved. |
| [taskflow-complexity-final.md](./taskflow-complexity-final.md) | Compare results and conclusions. | This report. |

No backend files, database indexes, or production data were changed. Other pre-existing uncommitted changes were preserved.

## G. Functional Test Results

| Workflow step | Before | After |
|---|---:|---:|
| Open landing page | 5/5 passed | 5/5 passed |
| Navigate to login | 5/5 passed | 5/5 passed |
| Log in | 5/5 passed | 5/5 passed |
| Load dashboard | 5/5 passed | 5/5 passed |
| Navigate to boards | 5/5 passed | 5/5 passed |
| Create test board | 5/5 passed | 5/5 passed |
| Open test board | 5/5 passed | 5/5 passed |
| Create test task | 5/5 passed | 5/5 passed |
| Open test task | 5/5 passed | 5/5 passed |
| Edit and save test task | 0/5 UI passes; API PATCH 5/5 returned 200 | 5/5 passed |
| Delete test task | 5/5 passed | 5/5 passed |
| Delete test board | 5/5 passed | 5/5 passed |

All created fixtures were uniquely named and removed through the UI. No existing user board or task was selected for deletion.

## H. Limitations

- One local machine, one test user, low fixture counts, one browser context at a time; results are not a concurrent load test.
- Pre-existing database contents, background traffic, warm caches, and process scheduling can affect these short runs.
- The before edit/save step was a failure, not a successful latency measurement; no before/after percentage is appropriate for that operation.
- The 401 refresh calls and their console resource errors existed in both passes. No new page errors or failed API requests appeared after the fix.
- The client lint command exited successfully with warnings; the Vite production build passed. No client/server test/spec files were found in the inspected source directories.
- The worktree contained unrelated uncommitted edits before this task, which were not reverted or included as changes from this task.

## I. Final Conclusion

- **Functional improvement:** task edit/save now completes, and all workflow actions passed five times after the fix.
- **Runtime improvements:** several after medians were lower, while login navigation, board open, and board deletion were slower. These small differences are not attributed to an algorithmic optimization; the only application change was frontend handler availability.
- **Big-O:** no time-complexity class changed. The new ref uses `O(1)` additional auxiliary space; task and board collection processing is unchanged.
- **Memory:** no meaningful algorithmic memory change was observed; process snapshots are too noisy to support that claim.
- **Further work:** only pursue pagination/query-plan/index or render optimizations after a larger representative dataset and repeatable load profile identify a sustained bottleneck. The measured local workflow does not justify speculative performance changes.
