require('dotenv').config();
if (process.env.MONGODB_TEST_URI) {
  process.env.MONGODB_URI = process.env.MONGODB_TEST_URI;
}

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./server');
const User = require('./src/models/User');
const Board = require('./src/models/Board');
const Column = require('./src/models/Column');
const Task = require('./src/models/Task');

async function runUserTests() {
  console.log('--- STARTING USER DASHBOARD VERIFICATION ---');
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    const testEmails = ['dash1@example.com', 'dash2@example.com'];
    await User.deleteMany({ email: { $in: testEmails } });
    await Board.deleteMany({ name: 'Dashboard Test Board' });
    await Task.deleteMany({ title: /Dash Task/ });

    const registerUser = async (name, email) => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name, email, password: 'password123' });
      return { user: res.body.data.user, token: res.body.data.token };
    };

    const user1 = await registerUser('Dash 1', 'dash1@example.com');
    const user2 = await registerUser('Dash 2', 'dash2@example.com');

    // Create board as user1
    const createRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ name: 'Dashboard Test Board', description: 'Testing dashboard' })
      .expect(201);
    const boardId = createRes.body.data.board._id;

    // Get default columns
    const colRes = await request(app)
      .get(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${user1.token}`)
      .expect(200);
    const colId = colRes.body.data.columns[0]._id;

    // Create tasks
    const today = new Date().toISOString().split('T')[0];
    await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ column: colId, title: 'Dash Task 1', assignee: user1.user._id, dueDate: today })
      .expect(201);
    
    await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ column: colId, title: 'Dash Task 2' }) // unassigned
      .expect(201);

    // Fetch dashboard for user 1
    const dash1 = await request(app)
      .get('/api/users/me/dashboard')
      .set('Authorization', `Bearer ${user1.token}`)
      .expect(200);
    
    if (dash1.body.data.tasksDueToday !== 1) {
      throw new Error(`Expected 1 task due today, got ${dash1.body.data.tasksDueToday}`);
    }
    if (dash1.body.data.recentTasks.length !== 1) {
      throw new Error(`Expected 1 recent task, got ${dash1.body.data.recentTasks.length}`);
    }
    console.log('Test 1: User 1 dashboard returns correct tasks due today and recent tasks - SUCCESS');

    // Fetch dashboard for user 2 (not in board)
    const dash2 = await request(app)
      .get('/api/users/me/dashboard')
      .set('Authorization', `Bearer ${user2.token}`)
      .expect(200);
    
    if (dash2.body.data.recentActivity.length !== 0 || dash2.body.data.recentTasks.length !== 0) {
      throw new Error('User 2 should have empty dashboard');
    }
    console.log('Test 2: User 2 isolated from User 1 board data - SUCCESS');

    console.log('--- ALL USER DASHBOARD TESTS PASSED ---');
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

if (require.main === module) {
  runUserTests();
}
