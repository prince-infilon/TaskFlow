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

async function runBoardTests() {
  console.log('--- STARTING BOARD & MEMBERSHIP VERIFICATION ---');
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    const testEmails = ['b_owner@example.com', 'b_member@example.com', 'b_other@example.com'];
    await User.deleteMany({ email: { $in: testEmails } });
    await Board.deleteMany({ name: 'Test Board API' });

    // Helper to register users
    const registerUser = async (name, email) => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name, email, password: 'password123' });
      return { user: res.body.data.user, token: res.body.data.token };
    };

    const owner = await registerUser('Owner', 'b_owner@example.com');
    const member = await registerUser('Member', 'b_member@example.com');
    const other = await registerUser('Other', 'b_other@example.com');

    // 1. Authenticated user can create a board
    const createRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Test Board API', description: 'Testing' })
      .expect(201);
    const boardId = createRes.body.data.board._id;
    console.log('Test 1: Authenticated user creates a board - SUCCESS');

    // 2. Unauthenticated board request -> 401
    await request(app)
      .get(`/api/boards/${boardId}`)
      .expect(401);
    console.log('Test 2: Unauthenticated request gets 401 - SUCCESS');

    // 3. Non-member cannot access another board -> 404 (secure)
    await request(app)
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(404);
    console.log('Test 3: Non-member gets secure 404 accessing board - SUCCESS');

    // 4. Board manager can add a member
    await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: 'b_member@example.com', role: 'member' })
      .expect(200);
    console.log('Test 4: Board manager adds a member - SUCCESS');

    // 5. Board member cannot add a member
    await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ email: 'b_other@example.com', role: 'member' })
      .expect(403);
    console.log('Test 5: Board member gets 403 trying to add member - SUCCESS');

    // 6. Duplicate member is rejected (409)
    await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: 'b_member@example.com', role: 'manager' })
      .expect(409);
    console.log('Test 6: Duplicate member rejected with 409 - SUCCESS');

    // 7. Unauthorized user (member) cannot delete a board
    await request(app)
      .delete(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
    console.log('Test 7: Member gets 403 trying to delete board - SUCCESS');

    // 8. Manager can delete board
    await request(app)
      .delete(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    console.log('Test 8: Manager successfully deletes board - SUCCESS');

    console.log('--- ALL BOARD TESTS PASSED ---');
  } catch (error) {
    console.error('TEST FAILED:', error.message || error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

runBoardTests();
