const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const frontendUrl = process.env.TASKFLOW_FRONTEND_URL || 'http://localhost:5173';
const backendUrl = process.env.TASKFLOW_BACKEND_URL || 'http://localhost:5000';
const email = process.env.TASKFLOW_TEST_EMAIL;
const password = process.env.TASKFLOW_TEST_PASSWORD;
const runCount = Number.parseInt(process.env.TASKFLOW_BENCHMARK_RUNS || '5', 10);
const label = process.env.TASKFLOW_BENCHMARK_LABEL || 'BASE';
const outputPath = process.argv[2];

if (!email || !password) {
  throw new Error('Set TASKFLOW_TEST_EMAIL and TASKFLOW_TEST_PASSWORD in the environment.');
}
if (!Number.isInteger(runCount) || runCount < 1) {
  throw new Error('TASKFLOW_BENCHMARK_RUNS must be a positive integer.');
}
if (!outputPath) {
  throw new Error('Pass an output JSON path as the first argument.');
}

const healthSample = async () => {
  const response = await fetch(`${backendUrl}/api/health`);
  if (!response.ok) {
    throw new Error(`Backend health check returned HTTP ${response.status}.`);
  }

  const health = await response.json();
  return {
    sampledAt: health.timestamp,
    databaseStatus: health.database?.status,
    rssMb: health.system?.memory?.rssMb,
    heapUsedMb: health.system?.memory?.heapUsedMb,
    heapTotalMb: health.system?.memory?.heapTotalMb
  };
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const runTrial = async (browser, trialNumber) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const steps = [];
  const apiCalls = [];
  const browserErrors = [];
  const failedRequests = [];
  const pendingRequests = new Map();
  let boardName;
  let boardId;
  let taskName;
  let updatedTaskName;
  let boardCreated = false;
  let taskCreated = false;
  let boardDeleted = false;
  let taskDeleted = false;

  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('request', (request) => {
    if (request.url().startsWith(`${backendUrl}/api/`)) {
      pendingRequests.set(request, {
        startedAt: new Date().toISOString(),
        startedMs: performance.now(),
        method: request.method(),
        path: new URL(request.url()).pathname
      });
    }
  });
  page.on('requestfinished', async (request) => {
    const started = pendingRequests.get(request);
    if (!started) return;
    pendingRequests.delete(request);
    const response = await request.response();
    apiCalls.push({
      ...started,
      finishedAt: new Date().toISOString(),
      durationMs: Number((performance.now() - started.startedMs).toFixed(2)),
      status: response?.status() ?? null
    });
  });
  page.on('requestfailed', (request) => {
    const started = pendingRequests.get(request);
    if (!started) return;
    pendingRequests.delete(request);
    failedRequests.push({
      method: started.method,
      path: started.path,
      error: request.failure()?.errorText || 'Request failed'
    });
  });

  const measure = async (operation, action) => {
    const startedAt = new Date().toISOString();
    const startedMs = performance.now();
    const apiStartIndex = apiCalls.length;
    const result = { operation, startedAt, success: false };
    steps.push(result);
    try {
      await action();
      await page.waitForTimeout(25);
      result.success = true;
    } catch (error) {
      result.error = error.message;
      throw error;
    } finally {
      result.endedAt = new Date().toISOString();
      result.durationMs = Number((performance.now() - startedMs).toFixed(2));
      result.apiCalls = apiCalls.slice(apiStartIndex);
    }
  };

  const ensureBoardDeleted = async () => {
    if (!boardCreated || boardDeleted) return;
    if (!boardId) {
      if (!page.url().endsWith('/app/boards')) {
        await page.goto(`${frontendUrl}/app/boards`);
      }
      await page.getByText('Loading boards...').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {});
      await page.getByRole('heading', { name: 'Boards', exact: true }).waitFor({ timeout: 5000 });
      const boardCard = page.getByRole('heading', { name: boardName, exact: true });
      if (await boardCard.count()) {
        await boardCard.click();
        await page.waitForURL(/\/app\/boards\/[^/]+$/);
        boardId = page.url().split('/').pop();
      }
    } else {
      await page.goto(`${frontendUrl}/app/boards/${boardId}`);
    }

    if (boardId && taskCreated && !taskDeleted) {
      const names = [updatedTaskName, taskName].filter(Boolean);
      let taskHeading;
      for (const name of names) {
        const candidate = page.getByRole('heading', { name, exact: true });
        try {
          await candidate.waitFor({ timeout: 5000 });
          taskHeading = candidate;
          break;
        } catch (error) {
          if (!error.message.includes('Timeout')) throw error;
        }
      }
      if (!taskHeading) throw new Error('Created task could not be located for UI cleanup.');
      await taskHeading.click();
      await page.getByRole('button', { name: 'Delete Task', exact: true }).click();
      await page.getByRole('button', { name: 'Delete Task', exact: true }).last().click();
      await page.getByRole('button', { name: new RegExp(escapeRegExp(taskName)) }).waitFor({ state: 'detached' });
      taskDeleted = true;
    }

    if (boardId && !boardDeleted) {
      await page.getByRole('button', { name: 'Board settings' }).click();
      await page.getByRole('button', { name: 'Delete Board', exact: true }).first().click();
      await page.getByRole('button', { name: 'Delete Board', exact: true }).last().click();
      await page.waitForURL('**/app/boards');
      await page.getByText('Loading boards...').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {});
      boardDeleted = true;
    }
  };

  try {
    await measure('Open landing page', async () => {
      await page.goto(frontendUrl);
      await page.getByRole('heading', { name: 'The calm, confident way to manage your work.' }).waitFor();
    });

    await measure('Navigate to login', async () => {
      await page.getByRole('link', { name: 'Log in' }).click();
      await page.waitForURL('**/login');
      await page.getByLabel('Email address').waitFor();
    });

    await measure('Log in', async () => {
      await page.getByLabel('Email address').fill(email);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Log in' }).click();
      await page.waitForURL('**/app');
    });

    await measure('Load dashboard', async () => {
      await page.getByRole('heading', { name: /Good morning/ }).waitFor();
    });

    await measure('Navigate to boards', async () => {
      await page.getByRole('link', { name: 'Boards' }).click();
      await page.waitForURL('**/app/boards');
      await page.getByRole('heading', { name: 'Boards', exact: true }).waitFor();
    });

    boardName = `PerfBench-${label}-${trialNumber}-${Date.now()}`;
    await measure('Create test board', async () => {
      await page.getByRole('button', { name: 'Create Board' }).first().click();
      await page.getByPlaceholder('e.g., Marketing Campaign').fill(boardName);
      await page.getByPlaceholder('What is this board for?').fill('Temporary Playwright performance benchmark fixture.');
      await page.getByRole('button', { name: 'Create Board' }).last().click();
      boardCreated = true;
      await page.getByRole('heading', { name: boardName, exact: true }).waitFor({ timeout: 20000 });
    });

    await measure('Open test board', async () => {
      await page.getByRole('heading', { name: boardName, exact: true }).click();
      await page.waitForURL(/\/app\/boards\/[^/]+$/);
      boardId = page.url().split('/').pop();
      await page.getByRole('button', { name: 'Add Task', exact: true }).waitFor();
    });

    taskName = `PerfTask-${label}-${trialNumber}-${Date.now()}`;
    await measure('Create test task', async () => {
      await page.getByRole('button', { name: 'Add Task', exact: true }).click();
      await page.getByPlaceholder('e.g., Fix navigation bug').fill(taskName);
      await page.getByPlaceholder('Add details about this task...').fill('Temporary Playwright task created for the benchmark.');
      await page.getByRole('button', { name: 'Create Task', exact: true }).click();
      taskCreated = true;
      await page.getByRole('heading', { name: taskName, exact: true }).waitFor({ timeout: 20000 });
    });

    await measure('Open test task', async () => {
      await page.getByRole('heading', { name: taskName, exact: true }).click();
      await page.getByRole('button', { name: 'Edit Task' }).waitFor();
    });

    updatedTaskName = `${taskName}-edited`;
    let taskEditError;
    try {
      await measure('Edit and save test task', async () => {
      await page.getByRole('button', { name: 'Edit Task' }).click();
      const editDialog = page.getByRole('dialog', { name: 'Edit Task' });
      await editDialog.getByRole('textbox').nth(0).fill(updatedTaskName);
      await editDialog.getByRole('textbox').nth(1).fill('Updated by the Playwright benchmark.');
      await editDialog.getByRole('button', { name: 'Save Changes' }).click();
      const uiError = editDialog.getByText(/handleTaskUpdated is not defined/);
      const outcome = await Promise.race([
        editDialog.waitFor({ state: 'hidden', timeout: 15000 }).then(() => 'closed'),
        uiError.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'error')
      ]);
      if (outcome === 'error') throw new Error(await uiError.textContent());
      const updatedCard = page.getByRole('button', { name: new RegExp(escapeRegExp(updatedTaskName)) });
      await updatedCard.waitFor();
      await updatedCard.getByText('Updated by the Playwright benchmark.').waitFor();
      });
    } catch (error) {
      taskEditError = error.message;
      browserErrors.push(`Task edit UI failure: ${taskEditError}`);
      const editDialog = page.getByRole('dialog', { name: 'Edit Task' });
      if (await editDialog.count()) {
        await editDialog.getByRole('button', { name: 'Cancel' }).click();
      }
    }

    await measure('Delete test task', async () => {
      await page.getByRole('button', { name: 'Delete Task', exact: true }).click();
      await page.getByRole('button', { name: 'Delete Task', exact: true }).last().click();
      await page.getByRole('button', { name: new RegExp(escapeRegExp(updatedTaskName)) }).waitFor({ state: 'detached' });
      taskDeleted = true;
    });

    await measure('Delete test board', async () => {
      await page.getByRole('button', { name: 'Board settings' }).click();
      await page.getByRole('dialog', { name: 'Board Settings' }).getByRole('button', { name: 'Delete Board' }).click();
      await page.getByRole('button', { name: 'Delete Board', exact: true }).last().click();
      await page.waitForURL('**/app/boards');
      await page.getByRole('heading', { name: boardName, exact: true }).waitFor({ state: 'detached' });
      boardDeleted = true;
    });

    if (taskEditError) throw new Error(`Edit and save test task failed: ${taskEditError}`);
  } catch (error) {
    if (!browserErrors.some((message) => message.includes(error.message))) {
      browserErrors.push(`Workflow failure: ${error.message}`);
    }
    try {
      await ensureBoardDeleted();
    } catch (cleanupError) {
      browserErrors.push(`Test-board cleanup failure: ${cleanupError.message}`);
    }
  }

  await page.waitForTimeout(50);
  const result = {
    trial: trialNumber,
    label,
    functionalSuccess: steps.every((step) => step.success),
    boardCreated,
    taskDeleted,
    boardDeleted,
    steps,
    apiCalls,
    browserErrors,
    failedRequests
  };
  await context.close();
  return result;
};

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (let trial = 1; trial <= runCount; trial += 1) {
      const memoryBefore = await healthSample();
      const result = await runTrial(browser, trial);
      const memoryAfter = await healthSample();
      results.push({ ...result, memoryBefore, memoryAfter });
    }
  } finally {
    await browser.close();
  }

  const output = {
    generatedAt: new Date().toISOString(),
    frontendUrl,
    backendUrl,
    runCount,
    label,
    results
  };
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({
    generatedAt: output.generatedAt,
    runCount,
    label,
    outputPath,
    trials: results.map(({ trial, boardCreated, taskDeleted, boardDeleted, steps, apiCalls, browserErrors, failedRequests, memoryBefore, memoryAfter }) => ({
      trial,
      boardCreated,
      taskDeleted,
      boardDeleted,
      steps: steps.map(({ operation, startedAt, endedAt, durationMs, success, error, apiCalls: stepApiCalls }) => ({
        operation,
        startedAt,
        endedAt,
        durationMs,
        success,
        ...(error ? { error } : {}),
        ...(stepApiCalls?.length ? { apiCalls: stepApiCalls } : {})
      })),
      apiCalls,
      browserErrors,
      failedRequests,
      memoryBefore,
      memoryAfter
    }))
  }, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
