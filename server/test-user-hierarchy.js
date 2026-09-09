require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const app = require('./server');
const User = require('./src/models/User');

async function runHierarchyTests() {
  console.log('\n======================================================');
  console.log('🧪 TESTING HIERARCHICAL USER MANAGEMENT & AUTHORIZATION');
  console.log('======================================================\n');

  let exitCode = 0;

  // Wait for MongoDB connection
  for (let i = 0; i < 10; i++) {
    if (mongoose.connection.readyState === 1) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const timestamp = Date.now();
  const emails = {
    admin: `admin_${timestamp}@test.com`,
    managerA: `manager_a_${timestamp}@test.com`,
    managerB: `manager_b_${timestamp}@test.com`,
    memberA1: `member_a1_${timestamp}@test.com`,
    memberB1: `member_b1_${timestamp}@test.com`
  };

  let tokens = {};
  let userIds = {};

  try {
    // -------------------------------------------------------------------------
    // 1. Setup Test Users
    // -------------------------------------------------------------------------
    console.log('1️⃣  Setting up Admin, Manager A, Manager B, Member A1, Member B1...');
    const pwdHash = await bcrypt.hash('Password123!', 10);

    const adminUser = await User.create({
      name: 'Test Admin',
      email: emails.admin,
      passwordHash: pwdHash,
      globalRole: 'admin',
      isActive: true
    });
    userIds.admin = adminUser._id;

    const mgrA = await User.create({
      name: 'Manager A',
      email: emails.managerA,
      passwordHash: pwdHash,
      globalRole: 'manager',
      isActive: true
    });
    userIds.managerA = mgrA._id;

    const mgrB = await User.create({
      name: 'Manager B',
      email: emails.managerB,
      passwordHash: pwdHash,
      globalRole: 'manager',
      isActive: true
    });
    userIds.managerB = mgrB._id;

    const memA1 = await User.create({
      name: 'Member A1',
      email: emails.memberA1,
      passwordHash: pwdHash,
      globalRole: 'member',
      managerId: mgrA._id,
      isActive: true
    });
    userIds.memberA1 = memA1._id;

    const memB1 = await User.create({
      name: 'Member B1',
      email: emails.memberB1,
      passwordHash: pwdHash,
      globalRole: 'member',
      managerId: mgrB._id,
      isActive: true
    });
    userIds.memberB1 = memB1._id;

    // Login each to acquire tokens
    for (const [key, email] of Object.entries(emails)) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Password123!' });
      tokens[key] = res.body.data.token;
    }
    console.log('   ✅ All test accounts created and authenticated.');

    // -------------------------------------------------------------------------
    // 2. Strict Manager Isolation (GET /api/users)
    // -------------------------------------------------------------------------
    console.log('\n2️⃣  Testing Manager Isolation (Manager A listing users)...');
    const mgrAListRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tokens.managerA}`);

    if (mgrAListRes.status !== 200) {
      throw new Error(`Manager A list failed with status ${mgrAListRes.status}`);
    }

    const mgrAUsers = mgrAListRes.body.data.users;
    // Must see Member A1
    const seesA1 = mgrAUsers.some(u => u._id.toString() === userIds.memberA1.toString());
    // Must NEVER see Member B1, Manager B, or Admin
    const seesB1 = mgrAUsers.some(u => u._id.toString() === userIds.memberB1.toString());
    const seesMgrB = mgrAUsers.some(u => u._id.toString() === userIds.managerB.toString());
    const seesAdmin = mgrAUsers.some(u => u._id.toString() === userIds.admin.toString());

    if (!seesA1) throw new Error('Manager A cannot see their own member A1!');
    if (seesB1) throw new Error('SECURITY VIOLATION: Manager A can see Manager B\'s member B1!');
    if (seesMgrB || seesAdmin) throw new Error('SECURITY VIOLATION: Manager A can see other managers or admins!');

    console.log('   ✅ Manager A sees ONLY their assigned member (Member A1). Other users are completely hidden.');

    // -------------------------------------------------------------------------
    // 3. IDOR Defense (Manager A accessing Member B1 directly)
    // -------------------------------------------------------------------------
    console.log('\n3️⃣  Testing IDOR Defense (Manager A accessing Member B1 directly)...');
    const idorRes = await request(app)
      .get(`/api/users/${userIds.memberB1}`)
      .set('Authorization', `Bearer ${tokens.managerA}`);

    if (idorRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for IDOR attempt, got status ${idorRes.status}`);
    }
    console.log('   ✅ IDOR attempt blocked: Manager A received 403 Forbidden attempting to access Member B1.');

    // -------------------------------------------------------------------------
    // 4. Role Privilege Guard (Manager attempting to create Admin or Manager)
    // -------------------------------------------------------------------------
    console.log('\n4️⃣  Testing Privilege Guard (Manager attempting to create Admin)...');
    const privRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokens.managerA}`)
      .send({
        name: 'Sneaky Admin',
        email: `sneaky_${timestamp}@test.com`,
        password: 'Password123!',
        role: 'admin'
      });

    if (privRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden on illegal role creation, got ${privRes.status}`);
    }
    console.log('   ✅ Privilege escalation blocked: Manager cannot create Admin accounts.');

    // -------------------------------------------------------------------------
    // 5. Member Access Block (Member accessing /api/users)
    // -------------------------------------------------------------------------
    console.log('\n5️⃣  Testing Member Access Block...');
    const memAccessRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tokens.memberA1}`);

    if (memAccessRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for Member accessing user management, got ${memAccessRes.status}`);
    }
    console.log('   ✅ Members are strictly blocked from user management (403 Forbidden).');

    // -------------------------------------------------------------------------
    // 6. Admin Global Visibility & Member Reassignment
    // -------------------------------------------------------------------------
    console.log('\n6️⃣  Testing Admin Global Visibility & Reassignment...');
    const adminListRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tokens.admin}`);

    const adminUsers = adminListRes.body.data.users;
    const adminSeesAll = [userIds.admin, userIds.managerA, userIds.managerB, userIds.memberA1, userIds.memberB1].every(id =>
      adminUsers.some(u => u._id.toString() === id.toString())
    );

    if (!adminSeesAll) throw new Error('Admin is missing visibility to some users!');
    console.log('   ✅ Admin has complete visibility across all roles.');

    // Reassign Member A1 from Manager A -> Manager B
    console.log('   🔄 Reassigning Member A1 from Manager A -> Manager B...');
    const reassignRes = await request(app)
      .patch(`/api/users/${userIds.memberA1}/reassign`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ managerId: userIds.managerB });

    if (reassignRes.status !== 200) {
      throw new Error(`Reassignment failed with status ${reassignRes.status}: ${JSON.stringify(reassignRes.body)}`);
    }

    // Now Manager A must NOT see Member A1 anymore
    const mgrAListAfter = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tokens.managerA}`);
    const seesA1After = mgrAListAfter.body.data.users.some(u => u._id.toString() === userIds.memberA1.toString());

    // Manager B MUST now see Member A1
    const mgrBListAfter = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tokens.managerB}`);
    const mgrBSeesA1 = mgrBListAfter.body.data.users.some(u => u._id.toString() === userIds.memberA1.toString());

    if (seesA1After) throw new Error('Manager A still sees Member A1 after reassignment!');
    if (!mgrBSeesA1) throw new Error('Manager B does not see newly assigned Member A1!');

    console.log('   ✅ Member A1 successfully transferred: Manager A lost access, Manager B gained access.');

    // -------------------------------------------------------------------------
    // 7. Self-Deactivation Guard for Admin
    // -------------------------------------------------------------------------
    console.log('\n7️⃣  Testing Self-Deactivation Guard...');
    const selfDeactivateRes = await request(app)
      .patch(`/api/users/${userIds.admin}/status`)
      .set('Authorization', `Bearer ${tokens.admin}`);

    if (selfDeactivateRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request on Admin self-deactivation, got ${selfDeactivateRes.status}`);
    }
    console.log('   ✅ Admin self-deactivation prevented.');

    console.log('\n======================================================');
    console.log('🎉 ALL USER HIERARCHY TESTS PASSED SUCCESSFULLY');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ HIERARCHY TEST FAILED:', err.message);
    exitCode = 1;
  } finally {
    // Cleanup test users
    try {
      await User.deleteMany({ email: { $in: Object.values(emails) } });
    } catch (e) {}

    setTimeout(() => {
      process.exit(exitCode);
    }, 500);
  }
}

if (require.main === module) {
  runHierarchyTests();
}

module.exports = runHierarchyTests;
