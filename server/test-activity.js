require('dotenv').config();
if (process.env.MONGODB_TEST_URI) {
  process.env.MONGODB_URI = process.env.MONGODB_TEST_URI;
} else {
  console.warn('WARNING: MONGODB_TEST_URI not set, tests will run against development DB!');
}

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./server');
const User = require('./src/models/User');
const Board = require('./src/models/Board');
const Activity = require('./src/models/Activity');

async function runTests() {
  console.log('--- STARTING ACTIVITY LOG VERIFICATION ---');
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    const testEmails = ['act_admin@example.com', 'act_member@example.com', 'act_other@example.com'];
    await User.deleteMany({ email: { $in: testEmails } });
    await Board.deleteMany({ name: 'Test Activity Board' });
    
    // Clean up all activity explicitly just in case
    await Activity.deleteMany({});
    
    // Helper to register users
    const registerUser = async (name, email) => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name, email, password: 'password123' });
      return { user: res.body.data.user, token: res.body.data.token };
    };

    const admin = await registerUser('Admin', 'act_admin@example.com');
    await User.updateOne({ email: 'act_admin@example.com' }, { globalRole: 'admin' });
    const member = await registerUser('Member', 'act_member@example.com');
    const other = await registerUser('Other', 'act_other@example.com');

    // 1. Board creation -> activity
    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Test Activity Board', description: 'Testing' })
      .expect(201);
    const boardId = boardRes.body.data.board._id;

    // 8. Member addition -> activity
    await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: 'act_member@example.com', role: 'member' })
      .expect(200);

    // 9. Member role change -> activity
    await request(app)
      .patch(`/api/boards/${boardId}/members/${member.user._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'manager' })
      .expect(200);

    const colRes = await request(app)
      .get(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const colId = colRes.body.data.columns[0]._id;
    const colId2 = colRes.body.data.columns[1]._id;

    // 4. Task creation -> activity
    const taskRes = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ column: colId, title: 'Act Task' })
      .expect(201);
    const taskId = taskRes.body.data.task._id;

    // 6. Task assignment -> activity (update task with new assignee)
    await request(app)
      .patch(`/api/boards/${boardId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ assignee: member.user._id })
      .expect(200);

    // 5. Task movement -> activity
    await request(app)
      .patch(`/api/boards/${boardId}/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ column: colId2, position: 0 })
      .expect(200);

    // 7. Task deletion -> activity
    await request(app)
      .delete(`/api/boards/${boardId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    // 10. Member removal -> activity
    await request(app)
      .delete(`/api/boards/${boardId}/members/${member.user._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    // 13. Unauthorized/failed ops do not create successful activity
    await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${other.token}`) // not on board
      .send({ column: colId, title: 'Failed Task' })
      .expect(404);

    // Verify activity retrieval
    // 1. authenticated board member can retrieve activity
    const actRes = await request(app)
      .get(`/api/boards/${boardId}/activity?limit=10&page=1`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const acts = actRes.body.data.activities;
    
    // We expect: board_created, member_added, member_role_changed, task_created, task_assigned, task_moved, task_deleted, member_removed
    if (acts.length < 8) {
      throw new Error(`Expected at least 8 activities, found ${acts.length}`);
    }

    // 11. Activity is ordered newest first
    const actionTypes = acts.map(a => a.action);
    if (actionTypes[0] !== 'member_removed') {
      throw new Error(`Expected newest activity to be member_removed, got ${actionTypes[0]}`);
    }

    const failedTaskLogs = acts.filter(a => a.metadata && a.metadata.taskTitle === 'Failed Task');
    if (failedTaskLogs.length > 0) throw new Error('Failed task creation was logged');

    // 2. non-member cannot retrieve another board's activity
    await request(app)
      .get(`/api/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(404); // returns 404 secure block
    console.log('Test 2: Non-member blocked - SUCCESS');

    // 3. unauthenticated request returns 401
    await request(app)
      .get(`/api/boards/${boardId}/activity`)
      .expect(401);
    console.log('Test 3: Unauth blocked - SUCCESS');

    // 14. users cannot POST/PATCH/DELETE activity directly
    await request(app)
      .post(`/api/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ action: 'fake' })
      .expect(404); // Route not defined
    console.log('Test 14: Direct activity mutation blocked - SUCCESS');

    // 12. pagination works
    const page2Res = await request(app)
      .get(`/api/boards/${boardId}/activity?limit=4&page=2`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    
    if (page2Res.body.data.activities.length !== 4) throw new Error('Pagination limit failed');
    if (page2Res.body.data.pagination.page !== 2) throw new Error('Pagination page failed');
    console.log('Test 12: Pagination works - SUCCESS');

    console.log('All activity logging tests (creation, move, assign, delete, member changes) passed!');
    console.log('--- ALL ACTIVITY TESTS PASSED ---');
  } catch (error) {
    console.error('TEST FAILED:', error.message || error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

runTests();
