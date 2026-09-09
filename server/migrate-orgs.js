const mongoose = require('mongoose');
const User = require('./src/models/User');
const Board = require('./src/models/Board');
const Organization = require('./src/models/Organization');
const dns = require('dns');
require('dotenv').config();

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (error) {}

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow', {
      family: 4
    });
    console.log('Connected to MongoDB');

    const users = await User.find({});
    console.log(`Found ${users.length} users. Migrating...`);

    for (const user of users) {
      // Check if user already owns an organization
      let org = await Organization.findOne({ owner: user._id });
      
      if (!org) {
        org = new Organization({
          name: `${user.name}'s Workspace`,
          owner: user._id,
          members: [{ user: user._id, role: 'admin' }]
        });
        await org.save();
        console.log(`Created workspace for user ${user.name}`);
      }

      // Find all boards owned by this user that don't have an organizationId yet
      const boards = await Board.find({ owner: user._id, organizationId: { $exists: false } });
      
      for (const board of boards) {
        board.organizationId = org._id;
        
        // Ensure all board members are in the org
        for (const boardMember of board.members) {
          const isOrgMember = org.members.some(m => m.user.toString() === boardMember.user.toString());
          if (!isOrgMember) {
            org.members.push({ user: boardMember.user, role: 'member' });
          }
        }
        
        await org.save();
        await board.save();
        console.log(`Migrated board "${board.name}" to workspace "${org.name}"`);
      }
    }

    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
