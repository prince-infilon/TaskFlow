require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dns = require('dns');
const User = require('./src/models/User');
const Organization = require('./src/models/Organization');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const usersToSeed = [
  {
    name: 'Admin User',
    email: 'admin@taskflow.com',
    password: 'admin@123',
    globalRole: 'admin',
    orgRole: 'admin'
  },
  {
    name: 'Manager User',
    email: 'manager@taskflow.com',
    password: 'manager@123',
    globalRole: 'manager',
    orgRole: 'manager'
  },
  {
    name: 'Member User',
    email: 'member@taskflow.com',
    password: 'member@123',
    globalRole: 'member',
    orgRole: 'member'
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow', {
      family: 4
    });
    console.log('Connected to MongoDB');

    // Find or create default Organization
    let defaultOrg = await Organization.findOne({ name: 'TaskFlow HQ' });
    if (!defaultOrg) {
      // Temporary owner placeholder
      defaultOrg = new Organization({
        name: 'TaskFlow HQ',
        members: []
      });
    }

    for (const u of usersToSeed) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      let user = await User.findOne({ email: u.email });

      if (user) {
        user.passwordHash = passwordHash;
        user.globalRole = u.globalRole;
        user.isActive = true;
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        user.isTwoFactorEnabled = false;
        await user.save();
        console.log(`Updated user: ${u.email} (${u.globalRole})`);
      } else {
        user = await User.create({
          name: u.name,
          email: u.email,
          passwordHash,
          globalRole: u.globalRole,
          isActive: true
        });
        console.log(`Created user: ${u.email} (${u.globalRole})`);
      }

      if (u.globalRole === 'admin' && !defaultOrg.owner) {
        defaultOrg.owner = user._id;
      }

      // Add to defaultOrg if not present
      const existingMember = defaultOrg.members.find(m => m.user?.toString() === user._id.toString());
      if (existingMember) {
        existingMember.role = u.orgRole;
      } else {
        defaultOrg.members.push({ user: user._id, role: u.orgRole });
      }
    }

    if (!defaultOrg.owner && defaultOrg.members.length > 0) {
      defaultOrg.owner = defaultOrg.members[0].user;
    }

    await defaultOrg.save();
    console.log('Default organization updated with seeded members.');

    console.log('\n✅ All roles seeded successfully:');
    console.log(' - admin@taskflow.com : admin@123 (Admin)');
    console.log(' - manager@taskflow.com : manager@123 (Manager)');
    console.log(' - member@taskflow.com : member@123 (Member)\n');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
