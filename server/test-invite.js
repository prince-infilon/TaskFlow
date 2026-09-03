const mongoose = require('mongoose');
const User = require('./src/models/User');
const Board = require('./src/models/Board');
require('dotenv').config();

async function testInvite() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  try {
    const admin = await User.findOne({ globalRole: 'admin' });
    const board = await Board.findOne();
    const newMember = await User.create({ name: 'Member', email: 'member@taskflow.com', password: 'password123' });
    
    // Simulate req, res
    const req = {
      body: { email: 'member@taskflow.com', role: 'member' },
      user: admin,
      board: board
    };
    
    let statusCode;
    let jsonResponse;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResponse = data; }
    };
    
    const next = (err) => {
      console.error('NEXT CALLED WITH ERROR:', err);
    };

    const { addMember } = require('./src/controllers/boardController');
    await addMember(req, res, next);
    
    console.log('Result:', statusCode, jsonResponse);
  } catch (err) {
    console.error('CATCH ERROR:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testInvite();
