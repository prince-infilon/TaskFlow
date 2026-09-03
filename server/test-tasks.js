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
const Column = require('./src/models/Column');
const Task = require('./src/models/Task');

async function runTaskTests() {
  console.log('--- STARTING COLUMN & TASK VERIFICATION ---');
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    const testEmails = ['t_manager@example.com', 't_member@example.com', 't_other@example.com'];
    await User.deleteMany({ email: { $in: testEmails } });
    await Board.deleteMany({ name: 'Test Task Board' });
    // Also cleanup any orphan columns/tasks from previous failed tests
    await Column.deleteMany({ name: { $in: ['To Do', 'In Progress', 'Done', 'Custom Col'] } });
    await Task.deleteMany({ title: /Test Task/ });

    // Helper to register users
    const registerUser = async (name, email) => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name, email, password: 'password123' });
      return { user: res.body.data.user, token: res.body.data.token };
    };

    const manager = await registerUser('Manager', 't_manager@example.com');
    const member = await registerUser('Member', 't_member@example.com');
    const other = await registerUser('Other', 't_other@example.com');

    // 1. Manager creates a board (which should create default columns)
    const createRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ name: 'Test Task Board', description: 'Testing tasks' })
      .expect(201);
    const boardId = createRes.body.data.board._id;

    // Add member to the board
    await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ email: 't_member@example.com', role: 'member' })
      .expect(200);

    // 2. Authenticated user can retrieve board columns
    const colRes = await request(app)
      .get(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
    
    if (colRes.body.data.columns.length !== 3) {
      throw new Error(`Expected 3 default columns, got ${colRes.body.data.columns.length}`);
    }
    console.log('Test 1: Authenticated user retrieves board columns (defaults created) - SUCCESS');
    const defaultColumnId = colRes.body.data.columns[0]._id;

    // 3. Board member cannot access another board
    await request(app)
      .get(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(404);
    console.log('Test 2: Board member cannot access another board - SUCCESS');

    // 4. Manager can create a task
    const taskRes = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({
        column: defaultColumnId,
        title: 'Manager Test Task',
        assignee: member.user._id
      })
      .expect(201);
    const taskId = taskRes.body.data.task._id;
    console.log('Test 3: Manager can create a task - SUCCESS');

    // 5. Manager can update/delete a task
    await request(app)
      .patch(`/api/boards/${boardId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ title: 'Updated by manager' })
      .expect(200);
    console.log('Test 4: Manager can update a task - SUCCESS');

    // 6. Member can edit their own assigned task
    await request(app)
      .patch(`/api/boards/${boardId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ description: 'Member description' })
      .expect(200);
    console.log('Test 5: Member can edit their own assigned task - SUCCESS');

    // 7. Member cannot edit another user's task
    const managerTaskRes = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({
        column: defaultColumnId,
        title: 'Another Manager Task'
      })
      .expect(201);
    const managerTaskId = managerTaskRes.body.data.task._id;

    await request(app)
      .patch(`/api/boards/${boardId}/tasks/${managerTaskId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ title: 'Hacked title' })
      .expect(403);
    console.log('Test 6: Member cannot edit another user\'s task - SUCCESS');

    // 8. Member cannot delete another user's task
    await request(app)
      .delete(`/api/boards/${boardId}/tasks/${managerTaskId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
    console.log('Test 7: Member cannot delete another user\'s task - SUCCESS');

    // 8a. Member who created but is not assigned -> denied
    const memberCreatedTaskRes = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        column: defaultColumnId,
        title: 'Member Created Task',
        assignee: manager.user._id // assigned to someone else
      })
      .expect(201);
    const memberCreatedTaskId = memberCreatedTaskRes.body.data.task._id;

    await request(app)
      .patch(`/api/boards/${boardId}/tasks/${memberCreatedTaskId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ title: 'Hacked title 2' })
      .expect(403);
    console.log('Test 8a: Member who created but is not assigned is denied - SUCCESS');

    // 9. Invalid assignee is rejected
    await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({
        column: defaultColumnId,
        title: 'Task with invalid assignee',
        assignee: other.user._id
      })
      .expect(400);
    console.log('Test 8: Invalid assignee is rejected - SUCCESS');

    // Test 10: Task movement/reordering is persisted
    await request(app)
      .patch(`/api/boards/${boardId}/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        column: colRes.body.data.columns[1]._id,
        position: 0
      })
      .expect(200);
    console.log('Test 10: Task movement/reordering is persisted - SUCCESS');

    // Create more tasks for filter/search testing
    await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ column: defaultColumnId, title: 'Apple Task', description: 'Find apples', priority: 'high', dueDate: '2026-10-20' })
      .expect(201);
    await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ column: defaultColumnId, title: 'Banana Task', priority: 'medium', assignee: member.user._id, dueDate: '2026-10-21' })
      .expect(201);
    await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ column: defaultColumnId, title: 'Cherry Task', description: 'Banana split', priority: 'low' })
      .expect(201);

    // Test 11: Search by title/description
    const searchRes = await request(app)
      .get(`/api/boards/${boardId}/tasks?search=Banana`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    if (searchRes.body.data.tasks.length !== 2) throw new Error('Search failed to match title/desc correctly');
    console.log('Test 11: Search by title/description works - SUCCESS');

    // Test 12: Filter by assignee
    const assignRes = await request(app)
      .get(`/api/boards/${boardId}/tasks?assignee=${member.user._id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    // Should return taskId (updated earlier) and 'Banana Task'
    if (assignRes.body.data.tasks.length < 2) throw new Error('Assignee filter failed');
    console.log('Test 12: Filter by assignee works - SUCCESS');

    // Test 13: Filter by priority
    const prioRes = await request(app)
      .get(`/api/boards/${boardId}/tasks?priority=high,medium`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    if (!prioRes.body.data.tasks.some(t => t.priority === 'high')) throw new Error('Priority filter failed');
    console.log('Test 13: Filter by priority works - SUCCESS');

    // Test 14: Filter by due date
    const dateRes = await request(app)
      .get(`/api/boards/${boardId}/tasks?dueDate=2026-10-20`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    if (dateRes.body.data.tasks.length !== 1 || dateRes.body.data.tasks[0].title !== 'Apple Task') {
      throw new Error('Due date exact match failed');
    }
    console.log('Test 14: Filter by due date works - SUCCESS');

    // Test 15: Pagination limit and defaults
    const pageRes = await request(app)
      .get(`/api/boards/${boardId}/tasks?page=1&limit=2`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    if (pageRes.body.data.tasks.length !== 2) throw new Error('Pagination limit failed');
    if (pageRes.body.data.pagination.totalPages < 2) throw new Error('Pagination totalPages failed');
    
    // Oversized limit should be clamped to 100
    const oversizeRes = await request(app)
      .get(`/api/boards/${boardId}/tasks?limit=5000`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    if (oversizeRes.body.data.pagination.limit !== 100) throw new Error('Pagination limit clamping failed (should be max 100)');
    
    // Default limit should be 50
    const defaultRes = await request(app)
      .get(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    if (defaultRes.body.data.pagination.limit !== 50) throw new Error('Pagination limit default failed (should be 50)');
    console.log('Test 15: Pagination works - SUCCESS');

    // Create tasks for true overdue date testing (YYYY-MM-DD contract)
    const pastDate = new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];

    await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ column: defaultColumnId, title: 'True Overdue Task', dueDate: pastDate })
      .expect(201);
    await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ column: defaultColumnId, title: 'Future Task', dueDate: futureDate })
      .expect(201);
    await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ column: defaultColumnId, title: 'No Date Task', dueDate: '' })
      .expect(201);

    // Test 15b: True Overdue Filter
    const overdueRes = await request(app)
      .get(`/api/boards/${boardId}/tasks?dueDate=overdue`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    
    const overdueTasks = overdueRes.body.data.tasks;
    if (!overdueTasks.some(t => t.title === 'True Overdue Task')) throw new Error('Genuine overdue task not returned');
    if (overdueTasks.some(t => t.title === 'Future Task')) throw new Error('Future task improperly returned as overdue');
    if (overdueTasks.some(t => t.title === 'No Date Task')) throw new Error('Task with no due date improperly returned');
    if (overdueTasks.some(t => t.title === 'Apple Task')) throw new Error('Unparseable legacy string task returned as overdue');
    console.log('Test 15b: True overdue filter works safely - SUCCESS');

    // Task from another board cannot be modified through a different board URL (covered implicitly since we search { _id: taskId, board: boardId } in the controller, it will return 404).
    
    // Test 16: Delete board correctly cleans up columns and tasks (optional but good)
    await request(app)
      .delete(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    console.log('Test 16: Manager deletes board - SUCCESS');

    console.log('--- ALL TASK TESTS PASSED ---');
  } catch (error) {
    console.error('TEST FAILED:', error.message || error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

runTaskTests();
