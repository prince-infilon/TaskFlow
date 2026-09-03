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
const { authenticate, authorize } = require('./src/middleware/authMiddleware');

// Mount dummy routes for RBAC testing directly on the app instance
app.get('/api/admin/dashboard', authenticate, authorize('admin'), (req, res) => {
  res.status(200).json({ success: true, data: { message: 'Welcome Admin' } });
});

app.get('/api/manager/dashboard', authenticate, authorize('admin', 'manager'), (req, res) => {
  res.status(200).json({ success: true, data: { message: 'Welcome Manager' } });
});

async function runRbacTests() {
  console.log('--- STARTING RBAC VERIFICATION ---');

  // Wait for MongoDB to connect
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    // Cleanup any previous test data for these specific emails instead of wiping the entire database
    await User.deleteMany({ email: { $in: ['member@example.com', 'admin2@example.com', 'admin@example.com'] } });
    
    // 1. Create a regular user (member)
    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Member', email: 'member@example.com', password: 'password123' })
      .expect(201);
    const memberToken = memberRes.body.data.token;

    // 2. Create an admin user (directly via mongoose to bypass register defaults)
    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash: 'dummyhash',
      globalRole: 'admin'
    });
    
    // Login admin to get token
    // Wait, login requires real password hash. Let's just create an admin by updating a registered user
    const adminRegRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin2', email: 'admin2@example.com', password: 'password123' })
      .expect(201);
    
    await User.updateOne({ email: 'admin2@example.com' }, { globalRole: 'admin' });
    
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin2@example.com', password: 'password123' })
      .expect(200);
    const adminToken = adminLoginRes.body.data.token;

    // TEST 1: No token -> 401
    await request(app).get('/api/users/me').expect(401);
    console.log('Test 1: No token rejected with 401 - SUCCESS');

    // TEST 2: Invalid token -> 401
    await request(app).get('/api/users/me').set('Authorization', 'Bearer invalid.token.here').expect(401);
    console.log('Test 2: Invalid token rejected with 401 - SUCCESS');

    // TEST 3: Authenticated user -> allowed
    const meRes = await request(app).get('/api/users/me').set('Authorization', `Bearer ${memberToken}`).expect(200);
    if (!meRes.body.data.user.email) throw new Error('User object not loaded by authenticate middleware');
    console.log('Test 3: Authenticated user loads full user object - SUCCESS');

    // TEST 4: Member accessing Admin route -> 403 Forbidden
    await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${memberToken}`).expect(403);
    console.log('Test 4: Member attempting admin route gets 403 - SUCCESS');

    // TEST 5: Admin accessing Admin route -> 200 OK
    await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${adminToken}`).expect(200);
    console.log('Test 5: Admin attempting admin route gets 200 - SUCCESS');

    // TEST 6: Admin accessing Manager route -> 200 OK (allowedRoles array includes 'admin')
    await request(app).get('/api/manager/dashboard').set('Authorization', `Bearer ${adminToken}`).expect(200);
    console.log('Test 6: Admin attempting manager route gets 200 - SUCCESS');

    console.log('--- ALL RBAC TESTS PASSED ---');
  } catch (error) {
    console.error('TEST FAILED:', error.message || error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

runRbacTests();
