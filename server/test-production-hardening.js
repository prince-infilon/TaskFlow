require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = require('./server');
const User = require('./src/models/User');
const Organization = require('./src/models/Organization');
const Board = require('./src/models/Board');
const Column = require('./src/models/Column');

async function runHardeningTests() {
  console.log('\n========================================');
  console.log('🧪 RUNNING PRODUCTION HARDENING TEST SUITE');
  console.log('========================================\n');

  let exitCode = 0;

  // Wait for MongoDB connection
  for (let i = 0; i < 10; i++) {
    if (mongoose.connection.readyState === 1) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const testEmail = `hardening_test_${Date.now()}@example.com`;
  let token = '';
  let testOrgId = '';
  let testBoardId = '';
  let testColumnId = '';

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Production Health Check Endpoint
    // -------------------------------------------------------------------------
    console.log('1️⃣  Testing Health Check (/api/health)...');
    const healthRes = await request(app).get('/api/health');
    if (healthRes.status !== 200 && healthRes.status !== 503) {
      throw new Error(`Health check returned unexpected status ${healthRes.status}`);
    }
    if (!healthRes.body.database || typeof healthRes.body.uptime !== 'number' || !healthRes.body.system) {
      throw new Error('Health check response is missing critical observability fields (database, uptime, system)');
    }
    console.log('   ✅ Health check returned valid observability metrics and DB status.');

    // -------------------------------------------------------------------------
    // Setup Test User & Workspace Context
    // -------------------------------------------------------------------------
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hardening Tester',
        email: testEmail,
        password: 'Password123!'
      });

    token = userRes.body.data.token;

    // Get default org created on register
    const orgsRes = await request(app)
      .get('/api/orgs')
      .set('Authorization', `Bearer ${token}`);

    const orgList = orgsRes.body.organizations || orgsRes.body.data;
    testOrgId = orgList[0]._id;

    // Create a board
    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', testOrgId)
      .send({ name: 'Hardening Board' });

    const board = boardRes.body.data?.board || boardRes.body.data;
    testBoardId = board._id;

    // Fetch board columns
    const colsRes = await request(app)
      .get(`/api/boards/${testBoardId}/columns`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', testOrgId);

    const cols = colsRes.body.data?.columns || colsRes.body.columns || colsRes.body.data;
    testColumnId = cols[0]._id;


    // -------------------------------------------------------------------------
    // TEST 2: Task Route Input Validation
    // -------------------------------------------------------------------------
    console.log('\n2️⃣  Testing Task Input Validation...');
    // Missing title
    const invalidTitleRes = await request(app)
      .post(`/api/boards/${testBoardId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', testOrgId)
      .send({ column: testColumnId });

    if (invalidTitleRes.status !== 400 || !invalidTitleRes.body.error?.message?.includes('title')) {
      throw new Error(`Expected 400 with title error, received ${invalidTitleRes.status}: ${JSON.stringify(invalidTitleRes.body)}`);
    }

    // Invalid Column ID format
    const invalidColRes = await request(app)
      .post(`/api/boards/${testBoardId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', testOrgId)
      .send({ title: 'Valid Title', column: 'not-a-mongo-id' });

    if (invalidColRes.status !== 400 || !invalidColRes.body.error?.message?.includes('column ID')) {
      throw new Error(`Expected 400 with invalid column ID error, received ${invalidColRes.status}`);
    }

    // Valid Task Creation
    const validTaskRes = await request(app)
      .post(`/api/boards/${testBoardId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', testOrgId)
      .send({
        title: 'Hardening Task',
        column: testColumnId,
        priority: 'high'
      });

    if (validTaskRes.status !== 201) {
      throw new Error(`Failed to create valid task, status ${validTaskRes.status}`);
    }
    const createdTaskId = validTaskRes.body.data._id;
    console.log('   ✅ Input validation caught malformed task requests and permitted valid task creation.');

    // -------------------------------------------------------------------------
    // TEST 3: Column Input Validation
    // -------------------------------------------------------------------------
    console.log('\n3️⃣  Testing Column Input Validation...');
    const emptyColRes = await request(app)
      .post(`/api/boards/${testBoardId}/columns`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', testOrgId)
      .send({ name: '' });

    if (emptyColRes.status !== 400) {
      throw new Error(`Expected 400 on empty column name, received ${emptyColRes.status}`);
    }
    console.log('   ✅ Input validation rejected empty column name.');

    // -------------------------------------------------------------------------
    // TEST 4: Organization Input Validation
    // -------------------------------------------------------------------------
    console.log('\n4️⃣  Testing Organization & Member Validation...');
    const invalidOrgRes = await request(app)
      .post('/api/orgs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });

    if (invalidOrgRes.status !== 400) {
      throw new Error(`Expected 400 on empty org name, received ${invalidOrgRes.status}`);
    }

    const invalidInviteRes = await request(app)
      .post(`/api/orgs/${testOrgId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', testOrgId)
      .send({ email: 'not-an-email', role: 'member' });

    if (invalidInviteRes.status !== 400) {
      throw new Error(`Expected 400 on invalid invite email, received ${invalidInviteRes.status}`);
    }
    console.log('   ✅ Organization and member invite validation functioning correctly.');

    // -------------------------------------------------------------------------
    // TEST 5: File Upload Security Checks
    // -------------------------------------------------------------------------
    console.log('\n5️⃣  Testing File Upload Security (Disallowed Extensions)...');
    const dummyExecPath = path.join(__dirname, 'test_malicious.exe');
    fs.writeFileSync(dummyExecPath, 'MZdummyexecutablecontent');

    try {
      const uploadRes = await request(app)
        .post(`/api/boards/${testBoardId}/tasks/${createdTaskId}/attachments`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-organization-id', testOrgId)
        .attach('file', dummyExecPath);

      if (uploadRes.status !== 400 || !uploadRes.body.error?.message?.includes('prohibited')) {
        throw new Error(`Expected 400 rejection for .exe file, got ${uploadRes.status}: ${JSON.stringify(uploadRes.body)}`);
      }
      console.log('   ✅ Malicious executable upload correctly blocked.');
    } finally {
      if (fs.existsSync(dummyExecPath)) fs.unlinkSync(dummyExecPath);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Standard Error Handler Envelope Consistency
    // -------------------------------------------------------------------------
    console.log('\n6️⃣  Testing Error Handler Envelope & CastError Format...');
    const castErrorRes = await request(app)
      .get(`/api/boards/${testBoardId}/tasks/invalid-cast-id`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', testOrgId);

    if (castErrorRes.status !== 400 || castErrorRes.body.success !== false || !castErrorRes.body.error?.message) {
      throw new Error(`Error response does not match standardized envelope: ${JSON.stringify(castErrorRes.body)}`);
    }
    console.log('   ✅ Standardized error envelope { success: false, error: { message } } verified.');

    // -------------------------------------------------------------------------
    // TEST 7: Database Indexes Verification
    // -------------------------------------------------------------------------
    console.log('\n7️⃣  Testing Mongoose Model Indexes...');
    const taskIndexes = await mongoose.model('Task').listIndexes();
    const boardIndexes = await mongoose.model('Board').listIndexes();
    const orgIndexes = await mongoose.model('Organization').listIndexes();

    const hasTaskCompound = taskIndexes.some(idx => idx.key.board === 1 && idx.key.column === 1);
    const hasBoardOrg = boardIndexes.some(idx => idx.key.organizationId === 1);
    const hasOrgMember = orgIndexes.some(idx => idx.key['members.user'] === 1);

    if (!hasTaskCompound || !hasBoardOrg || !hasOrgMember) {
      throw new Error(`Missing expected database indexes. Task: ${hasTaskCompound}, Board: ${hasBoardOrg}, Org: ${hasOrgMember}`);
    }
    console.log('   ✅ Database indexes for Task, Board, and Organization verified in MongoDB.');

    console.log('\n========================================');
    console.log('🎉 ALL HARDENING TESTS PASSED SUCCESSFULLY');
    console.log('========================================\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    exitCode = 1;
  } finally {
    // Clean up test records
    try {
      await User.deleteOne({ email: testEmail });
      if (testOrgId) await Organization.deleteOne({ _id: testOrgId });
      if (testBoardId) {
        await Board.deleteOne({ _id: testBoardId });
        await Column.deleteMany({ board: testBoardId });
        await mongoose.model('Task').deleteMany({ board: testBoardId });
      }
    } catch (cleanErr) {
      // Ignore cleanup error
    }

    setTimeout(() => {
      process.exit(exitCode);
    }, 500);
  }
}

if (require.main === module) {
  runHardeningTests();
}

module.exports = runHardeningTests;
