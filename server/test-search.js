const mongoose = require('mongoose');
require('dotenv').config();
const Board = require('./src/models/Board');
const Task = require('./src/models/Task');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const user = await User.findOne();
    if (!user) return console.log('No user');
    console.log('User:', user.email);
    
    const regex = new RegExp('Production', 'i');
    let boardQuery = { name: regex };
    if (user.globalRole !== 'admin') {
      boardQuery['members.user'] = user._id;
    }
    const boards = await Board.find(boardQuery, 'name description').limit(5);
    console.log('Boards found:', boards);

    let accessibleBoardIds = boards.map(b => b._id);
    if (user.globalRole !== 'admin') {
      const allAccessibleBoards = await Board.find({ 'members.user': user._id }, '_id');
      accessibleBoardIds = allAccessibleBoards.map(b => b._id);
    }
    const tasks = await Task.find({
      board: { $in: accessibleBoardIds },
      $or: [{ title: regex }, { description: regex }]
    });
    console.log('Tasks found:', tasks);
    process.exit(0);
  });
