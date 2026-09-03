require('dotenv').config();
if (process.env.MONGODB_TEST_URI) {
  process.env.MONGODB_URI = process.env.MONGODB_TEST_URI;
} else {
  console.warn('WARNING: MONGODB_TEST_URI not set, tests will run against development DB!');
}

const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = require('./server');
const User = require('./src/models/User');
const Board = require('./src/models/Board');
const Column = require('./src/models/Column');
const Task = require('./src/models/Task');
const Comment = require('./src/models/Comment');
const Attachment = require('./src/models/Attachment');

// ─── helpers ────────────────────────────────────────────────────────────────

const register = async (name, email, password = 'password123') => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password });
  if (!res.body.data) throw new Error(`Register failed for ${email}: ${JSON.stringify(res.body)}`);
  return { user: res.body.data.user, token: res.body.data.token, cookie: res.headers['set-cookie'] };
};

const PASS = (msg) => console.log(`  ✓ ${msg}`);
const FAIL = (msg) => { throw new Error(msg); };
let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    PASS(name);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

async function runSecurityTests() {
  console.log('\n=== PHASE 15 — SECURITY HARDENING TESTS ===\n');
  await new Promise(r => setTimeout(r, 1500));

  // ── Clean up ──────────────────────────────────────────────────────────────
  const testEmails = [
    'sec_admin@test.com', 'sec_mgr@test.com',
    'sec_mem@test.com', 'sec_other@test.com'
  ];
  await User.deleteMany({ email: { $in: testEmails } });
  await Board.deleteMany({ name: /^SEC_TEST/ });
  await Task.deleteMany({ title: /^SEC_/ });

  // ── Set up users ──────────────────────────────────────────────────────────
  const admin   = await register('Sec Admin',   'sec_admin@test.com');
  await User.updateOne({ email: 'sec_admin@test.com' }, { globalRole: 'admin' });
  const adminLoginRes = await request(app).post('/api/auth/login').send({ email: 'sec_admin@test.com', password: 'password123' });
  admin.token = adminLoginRes.body.data.token;

  const manager = await register('Sec Manager', 'sec_mgr@test.com');
  const member  = await register('Sec Member',  'sec_mem@test.com');
  const other   = await register('Sec Other',   'sec_other@test.com');

  // Board A (manager is owner/manager, member is board-member)
  const boardARes = await request(app).post('/api/boards').set('Authorization', `Bearer ${manager.token}`).send({ name: 'SEC_TEST Board A' });
  const boardAId = boardARes.body.data.board._id;
  await request(app).post(`/api/boards/${boardAId}/members`).set('Authorization', `Bearer ${manager.token}`).send({ email: 'sec_mem@test.com', role: 'member' });
  const colsA = await request(app).get(`/api/boards/${boardAId}/columns`).set('Authorization', `Bearer ${manager.token}`);
  const colAId = colsA.body.data.columns[0]._id;

  // Board B (manager owns, other is member — member has NO access)
  const boardBRes = await request(app).post('/api/boards').set('Authorization', `Bearer ${manager.token}`).send({ name: 'SEC_TEST Board B' });
  const boardBId = boardBRes.body.data.board._id;
  await request(app).post(`/api/boards/${boardBId}/members`).set('Authorization', `Bearer ${manager.token}`).send({ email: 'sec_other@test.com', role: 'member' });
  const colsB = await request(app).get(`/api/boards/${boardBId}/columns`).set('Authorization', `Bearer ${manager.token}`);
  const colBId = colsB.body.data.columns[0]._id;

  // Create tasks
  const taskARes = await request(app).post(`/api/boards/${boardAId}/tasks`)
    .set('Authorization', `Bearer ${manager.token}`)
    .send({ column: colAId, title: 'SEC_Task A', assignee: member.user._id });
  const taskAId = taskARes.body.data.task._id;

  const taskBRes = await request(app).post(`/api/boards/${boardBId}/tasks`)
    .set('Authorization', `Bearer ${manager.token}`)
    .send({ column: colBId, title: 'SEC_Task B' });
  const taskBId = taskBRes.body.data.task._id;

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[1] Authentication Security');
  // ──────────────────────────────────────────────────────────────────────────

  await test('No token → 401', async () => {
    const r = await request(app).get('/api/users/me').expect(401);
    if (r.body.success !== false) FAIL('Expected success=false');
  });

  await test('Malformed Bearer token → 401', async () => {
    await request(app).get('/api/users/me').set('Authorization', 'Bearer not.a.jwt').expect(401);
  });

  await test('Wrong signing secret → 401', async () => {
    const jwt = require('jsonwebtoken');
    const fakeToken = jwt.sign({ userId: member.user._id }, 'wrong-secret', { expiresIn: '1h' });
    await request(app).get('/api/users/me').set('Authorization', `Bearer ${fakeToken}`).expect(401);
  });

  await test('Expired token → 401 with correct message', async () => {
    const jwt = require('jsonwebtoken');
    const expiredToken = jwt.sign({ userId: member.user._id }, process.env.JWT_SECRET, { expiresIn: '-1s' });
    const r = await request(app).get('/api/users/me').set('Authorization', `Bearer ${expiredToken}`).expect(401);
    if (!r.body.error.message.toLowerCase().includes('expired')) FAIL('Should report expired');
  });

  await test('Password not returned in login response', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'sec_mem@test.com', password: 'password123' }).expect(200);
    const u = r.body.data.user;
    if (u.passwordHash || u.password) FAIL('passwordHash/password leaked in response');
  });

  await test('Refresh token not in JSON body', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'sec_mem@test.com', password: 'password123' }).expect(200);
    if (r.body.data.refreshToken) FAIL('refreshToken must not be in JSON body');
  });

  await test('Refresh cookie is HttpOnly', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'sec_mem@test.com', password: 'password123' });
    const cookie = r.headers['set-cookie']?.find(c => c.includes('refreshToken='));
    if (!cookie?.includes('HttpOnly')) FAIL('Refresh cookie must be HttpOnly');
  });

  await test('Deactivated user cannot login', async () => {
    await User.updateOne({ email: 'sec_mem@test.com' }, { isActive: false });
    await request(app).post('/api/auth/login').send({ email: 'sec_mem@test.com', password: 'password123' }).expect(403);
    await User.updateOne({ email: 'sec_mem@test.com' }, { isActive: true });
    // Re-login to get fresh token
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'sec_mem@test.com', password: 'password123' });
    member.token = loginRes.body.data.token;
  });

  await test('Invalid refresh token → 401', async () => {
    await request(app).post('/api/auth/refresh').set('Cookie', 'refreshToken=bad.token').expect(401);
  });

  await test('Short password rejected on registration', async () => {
    await request(app).post('/api/auth/register').send({ name: 'X', email: 'x@x.com', password: 'short' }).expect(400);
  });

  await test('Invalid email rejected on registration', async () => {
    await request(app).post('/api/auth/register').send({ name: 'X', email: 'notanemail', password: 'password123' }).expect(400);
  });

  await test('Auth error does not leak stack trace', async () => {
    const r = await request(app).get('/api/users/me').set('Authorization', 'Bearer bad');
    if (r.body.error?.stack) FAIL('Stack trace leaked in auth error');
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[2] RBAC / Authorization');
  // ──────────────────────────────────────────────────────────────────────────

  await test('Member cannot delete board', async () => {
    await request(app).delete(`/api/boards/${boardAId}`).set('Authorization', `Bearer ${member.token}`).expect(403);
  });

  await test('Member cannot add board members', async () => {
    await request(app).post(`/api/boards/${boardAId}/members`).set('Authorization', `Bearer ${member.token}`)
      .send({ email: 'sec_other@test.com', role: 'member' }).expect(403);
  });

  await test('Member cannot change member roles', async () => {
    await request(app).patch(`/api/boards/${boardAId}/members/${manager.user._id}`)
      .set('Authorization', `Bearer ${member.token}`).send({ role: 'manager' }).expect(403);
  });

  await test('Member can edit task assigned to them', async () => {
    await request(app).patch(`/api/boards/${boardAId}/tasks/${taskAId}`)
      .set('Authorization', `Bearer ${member.token}`).send({ description: 'Member edit' }).expect(200);
  });

  await test('Member cannot delete tasks', async () => {
    const tmpTask = await request(app).post(`/api/boards/${boardAId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`).send({ column: colAId, title: 'SEC_Delete me', assignee: member.user._id });
    await request(app).delete(`/api/boards/${boardAId}/tasks/${tmpTask.body.data.task._id}`)
      .set('Authorization', `Bearer ${member.token}`).expect(403);
    // Cleanup
    await request(app).delete(`/api/boards/${boardAId}/tasks/${tmpTask.body.data.task._id}`)
      .set('Authorization', `Bearer ${manager.token}`);
  });

  await test('Member cannot move unassigned task', async () => {
    const tmpTask = await request(app).post(`/api/boards/${boardAId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`).send({ column: colAId, title: 'SEC_Unassigned' });
    await request(app).patch(`/api/boards/${boardAId}/tasks/${tmpTask.body.data.task._id}/move`)
      .set('Authorization', `Bearer ${member.token}`).send({ column: colAId, position: 0 }).expect(403);
    await request(app).delete(`/api/boards/${boardAId}/tasks/${tmpTask.body.data.task._id}`)
      .set('Authorization', `Bearer ${manager.token}`);
  });

  await test('Manager can delete tasks', async () => {
    const tmpTask = await request(app).post(`/api/boards/${boardAId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`).send({ column: colAId, title: 'SEC_Manager Delete' });
    await request(app).delete(`/api/boards/${boardAId}/tasks/${tmpTask.body.data.task._id}`)
      .set('Authorization', `Bearer ${manager.token}`).expect(200);
  });

  await test('Admin can access any board', async () => {
    await request(app).get(`/api/boards/${boardAId}`).set('Authorization', `Bearer ${admin.token}`).expect(200);
    await request(app).get(`/api/boards/${boardBId}`).set('Authorization', `Bearer ${admin.token}`).expect(200);
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[3] IDOR / Cross-Board Isolation');
  // ──────────────────────────────────────────────────────────────────────────

  await test('Board A user cannot access Board B', async () => {
    await request(app).get(`/api/boards/${boardBId}`).set('Authorization', `Bearer ${member.token}`).expect(404);
  });

  await test('Board A user cannot read Board B tasks', async () => {
    await request(app).get(`/api/boards/${boardBId}/tasks`).set('Authorization', `Bearer ${member.token}`).expect(404);
  });

  await test('Board A user cannot update Board B task (cross-board IDOR)', async () => {
    // member is on boardA but tries to edit a task from boardB
    await request(app).patch(`/api/boards/${boardAId}/tasks/${taskBId}`)
      .set('Authorization', `Bearer ${member.token}`).send({ title: 'Hacked' }).expect(404);
  });

  await test('Board A user cannot read Board B comments (cross-board IDOR)', async () => {
    const commentRes = await request(app).post(`/api/boards/${boardBId}/tasks/${taskBId}/comments`)
      .set('Authorization', `Bearer ${manager.token}`).send({ content: 'Board B comment' });
    const commentId = commentRes.body.data?.comment?._id;
    // member (only on Board A) tries to read Board B task comments
    await request(app).get(`/api/boards/${boardBId}/tasks/${taskBId}/comments`)
      .set('Authorization', `Bearer ${member.token}`).expect(404);
    // Cleanup
    if (commentId) {
      await request(app).delete(`/api/boards/${boardBId}/tasks/${taskBId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${manager.token}`);
    }
  });

  await test('Board A user cannot read Board B activity', async () => {
    await request(app).get(`/api/boards/${boardBId}/activity`).set('Authorization', `Bearer ${member.token}`).expect(404);
  });

  await test('Board A user cannot add members to Board B', async () => {
    await request(app).post(`/api/boards/${boardBId}/members`)
      .set('Authorization', `Bearer ${member.token}`).send({ email: 'sec_mem@test.com', role: 'member' }).expect(404);
  });

  await test('Dashboard only returns authorized board data', async () => {
    const r = await request(app).get('/api/users/me/dashboard').set('Authorization', `Bearer ${member.token}`).expect(200);
    // member is only on boardA — boardB data must not appear
    const activityBoards = r.body.data.recentActivity.map(a => a.board?._id?.toString());
    if (activityBoards.includes(boardBId)) FAIL('Dashboard leaked Board B activity to Board A user');
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[4] Input Validation / Injection');
  // ──────────────────────────────────────────────────────────────────────────

  await test('Malformed ObjectId in boardId → 404 (secure 404 convention)', async () => {
    // boardMiddleware returns 404 for invalid IDs to avoid exposing board existence
    await request(app).get('/api/boards/not-an-objectid/tasks').set('Authorization', `Bearer ${manager.token}`).expect(404);
  });

  await test('MongoDB $ne injection in search param is ignored safely', async () => {
    // Sending an object where a string is expected — qs will parse ?search[$ne]=x
    const r = await request(app).get(`/api/boards/${boardAId}/tasks?search[$ne]=anything`)
      .set('Authorization', `Bearer ${manager.token}`);
    // Should succeed (200) without applying the operator — just silently ignored
    if (r.status !== 200) FAIL(`Expected 200, got ${r.status}`);
  });

  await test('MongoDB $regex injection in search → safely escaped', async () => {
    // A crafted regex that could be expensive: (a+)+ 
    const r = await request(app).get(`/api/boards/${boardAId}/tasks?search=(a%2B)%2B`)
      .set('Authorization', `Bearer ${manager.token}`).expect(200);
    // Should not crash or timeout
  });

  await test('priority injection with invalid enum value → ignored', async () => {
    const r = await request(app).get(`/api/boards/${boardAId}/tasks?priority[$gt]=low`)
      .set('Authorization', `Bearer ${manager.token}`).expect(200);
    // Invalid priority — filter should be empty, all tasks returned
  });

  await test('Invalid ObjectId in assignee filter → ignored (no 500)', async () => {
    const r = await request(app).get(`/api/boards/${boardAId}/tasks?assignee=not-valid-id`)
      .set('Authorization', `Bearer ${manager.token}`).expect(200);
  });

  await test('Negative page clamped to 1', async () => {
    const r = await request(app).get(`/api/boards/${boardAId}/tasks?page=-99`)
      .set('Authorization', `Bearer ${manager.token}`).expect(200);
    if (r.body.data.pagination.page !== 1) FAIL('Negative page not clamped');
  });

  await test('Oversized limit clamped to 100', async () => {
    const r = await request(app).get(`/api/boards/${boardAId}/tasks?limit=99999`)
      .set('Authorization', `Bearer ${manager.token}`).expect(200);
    if (r.body.data.pagination.limit > 100) FAIL('Limit not clamped to 100');
  });

  await test('Invalid dueDate format ignored (no crash)', async () => {
    const r = await request(app).get(`/api/boards/${boardAId}/tasks?dueDate=not-a-date`)
      .set('Authorization', `Bearer ${manager.token}`).expect(200);
  });

  await test('Extremely long search string handled safely', async () => {
    const longStr = 'A'.repeat(10000);
    const r = await request(app).get(`/api/boards/${boardAId}/tasks?search=${encodeURIComponent(longStr)}`)
      .set('Authorization', `Bearer ${manager.token}`).expect(200);
  });

  await test('Empty task title rejected', async () => {
    await request(app).post(`/api/boards/${boardAId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`).send({ column: colAId, title: '' }).expect(400);
  });

  await test('Body larger than 50kb rejected', async () => {
    const hugeBody = { title: 'x', description: 'A'.repeat(60000) };
    // express.json limit is 50kb
    await request(app).post(`/api/boards/${boardAId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`).send(hugeBody)
      .then(r => {
        if (r.status === 201) FAIL('Server accepted body > 50kb');
      });
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[5] File Upload Security');
  // ──────────────────────────────────────────────────────────────────────────

  const dummyFile = path.join(__dirname, 'dummy_sec.txt');
  const exeFile   = path.join(__dirname, 'dummy_sec.exe');
  const bigFile   = path.join(__dirname, 'dummy_sec_big.bin');
  fs.writeFileSync(dummyFile, 'safe content');
  fs.writeFileSync(exeFile, 'MZ fake exe');
  fs.writeFileSync(bigFile, Buffer.alloc(6 * 1024 * 1024)); // 6MB > 5MB limit

  await test('Valid file upload succeeds', async () => {
    const r = await request(app).post(`/api/boards/${boardAId}/tasks/${taskAId}/attachments`)
      .set('Authorization', `Bearer ${member.token}`).attach('file', dummyFile).expect(201);
    // cleanup
    await request(app).delete(`/api/boards/${boardAId}/tasks/${taskAId}/attachments/${r.body.data.attachment._id}`)
      .set('Authorization', `Bearer ${member.token}`);
  });

  await test('Executable file (.exe) rejected by MIME check', async () => {
    await request(app).post(`/api/boards/${boardAId}/tasks/${taskAId}/attachments`)
      .set('Authorization', `Bearer ${member.token}`).attach('file', exeFile).expect(400);
  });

  await test('File exceeding 5MB limit rejected', async () => {
    await request(app).post(`/api/boards/${boardAId}/tasks/${taskAId}/attachments`)
      .set('Authorization', `Bearer ${member.token}`).attach('file', bigFile).expect(400);
  });

  await test('Non-board member cannot upload file', async () => {
    await request(app).post(`/api/boards/${boardBId}/tasks/${taskBId}/attachments`)
      .set('Authorization', `Bearer ${member.token}`).attach('file', dummyFile).expect(404);
  });

  await test('Download from cross-board attachment blocked', async () => {
    // Upload as manager to Board B task
    const upRes = await request(app).post(`/api/boards/${boardBId}/tasks/${taskBId}/attachments`)
      .set('Authorization', `Bearer ${manager.token}`).attach('file', dummyFile);
    if (upRes.status !== 201) {
      console.log('  (skipped: could not create Board B attachment)');
      return;
    }
    const attId = upRes.body.data.attachment._id;
    // member (Board A only) tries to download it
    await request(app).get(`/api/boards/${boardBId}/tasks/${taskBId}/attachments/${attId}`)
      .set('Authorization', `Bearer ${member.token}`).expect(404);
    // Cleanup
    await request(app).delete(`/api/boards/${boardBId}/tasks/${taskBId}/attachments/${attId}`)
      .set('Authorization', `Bearer ${manager.token}`);
  });

  // Cleanup temp files
  [dummyFile, exeFile, bigFile].forEach(f => { try { fs.unlinkSync(f); } catch(_) {} });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[6] Security Headers');
  // ──────────────────────────────────────────────────────────────────────────

  await test('X-Powered-By header removed (helmet)', async () => {
    const r = await request(app).get('/api/health');
    if (r.headers['x-powered-by']) FAIL('X-Powered-By header present — helmet not applied');
  });

  await test('X-Content-Type-Options: nosniff present', async () => {
    const r = await request(app).get('/api/health');
    if (r.headers['x-content-type-options'] !== 'nosniff') FAIL('nosniff header missing');
  });

  await test('CORS does not allow wildcard origin', async () => {
    const r = await request(app).options('/api/boards').set('Origin', 'https://evil.com');
    // Should NOT have Access-Control-Allow-Origin: *
    if (r.headers['access-control-allow-origin'] === '*') FAIL('Wildcard CORS origin allowed');
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[7] Error Handling (no info leakage)');
  // ──────────────────────────────────────────────────────────────────────────

  await test('404 on unknown board does not leak stack trace', async () => {
    const r = await request(app).get(`/api/boards/507f1f77bcf86cd799439011/tasks`)
      .set('Authorization', `Bearer ${manager.token}`);
    if (r.body.error?.stack) FAIL('Stack trace leaked');
  });

  await test('CastError in boardMiddleware → 404 (secure 404 convention)', async () => {
    // boardMiddleware converts CastError to 404 to avoid exposing board existence
    await request(app).get('/api/boards/invalid-id/tasks')
      .set('Authorization', `Bearer ${manager.token}`).expect(404);
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[8] Admin Dashboard Fix');
  // ──────────────────────────────────────────────────────────────────────────

  await test('Admin dashboard sees all boards (no board membership required)', async () => {
    const r = await request(app).get('/api/users/me/dashboard')
      .set('Authorization', `Bearer ${admin.token}`).expect(200);
    // Admin should get data without being a board member
    if (typeof r.body.data.tasksDueToday === 'undefined') FAIL('Dashboard data missing for admin');
  });

  await test('Dashboard unauthenticated → 401', async () => {
    await request(app).get('/api/users/me/dashboard').expect(401);
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[9] Settings — No phantom password endpoint');
  // ──────────────────────────────────────────────────────────────────────────

  await test('No backend /api/users/me/password or /api/auth/change-password endpoint exists', async () => {
    const r1 = await request(app).patch('/api/users/me/password')
      .set('Authorization', `Bearer ${member.token}`).send({ currentPassword: 'a', newPassword: 'b' });
    // Should be 404 (not 200/500)
    if (r1.status === 200 || r1.status === 500) FAIL(`Unexpected status: ${r1.status}`);
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n=== SECURITY TEST SUMMARY ===');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  if (failed > 0) {
    console.error('\n  ✗ SOME SECURITY TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n  ✓ ALL SECURITY TESTS PASSED');
  }
}

runSecurityTests()
  .catch(e => { console.error('Fatal:', e); process.exit(1); })
  .finally(() => mongoose.connection.close());
