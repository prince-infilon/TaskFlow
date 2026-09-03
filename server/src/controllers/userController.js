const Board = require('../models/Board');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

exports.getDashboardData = async (req, res, next) => {
  try {
    // 1. Find all boards the user is a member of (or all if admin)
    let boardQuery = {};
    if (req.user.globalRole !== 'admin') {
      boardQuery = { 'members.user': req.user._id };
    }
    const boards = await Board.find(boardQuery, '_id name');
    const boardIds = boards.map(b => b._id);

    // 2. Count tasks due today assigned to user
    const today = new Date().toISOString().split('T')[0];
    const tasksDueToday = await Task.countDocuments({
      board: { $in: boardIds },
      assignee: req.user._id,
      dueDate: today
    });

    // 3. Get recent tasks assigned to user
    const recentTasks = await Task.find({
      board: { $in: boardIds },
      assignee: req.user._id
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('board', 'name')
      .populate('assignee', 'name avatarUrl');

    // 4. Get recent activity across boards
    const recentActivity = await Activity.find({
      board: { $in: boardIds }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name avatarUrl')
      .populate('board', 'name');

    // 5. Build stats (Due today, In progress, Completed this week)
    // "In progress" assumes column logic or just simple mock for now since column status isn't strictly defined globally.
    // Let's just return the tasks due today for the stats tile.
    
    res.status(200).json({
      success: true,
      data: {
        tasksDueToday,
        recentTasks,
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyTasks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const query = { assignee: req.user._id };

    // Fetch tasks with pagination
    const tasks = await Task.find(query)
      .sort({ dueDate: 1, priority: -1 })
      .skip(skip)
      .limit(limit)
      .populate('board', 'name')
      .populate('column', 'name');

    const total = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(200).json({ success: true, data: { boards: [], tasks: [] } });
    }

    const regex = new RegExp(q, 'i');

    let boardQuery = { name: regex };
    if (req.user.globalRole !== 'admin') {
      boardQuery.$or = [
        { 'members.user': req.user._id },
        { owner: req.user._id }
      ];
    }
    const boards = await Board.find(boardQuery, 'name description').limit(5);

    // To find tasks, we need all boards the user can access
    let accessibleBoardIds = boards.map(b => b._id);
    if (req.user.globalRole !== 'admin') {
      const allAccessibleBoards = await Board.find({
        $or: [
          { 'members.user': req.user._id },
          { owner: req.user._id }
        ]
      }, '_id');
      accessibleBoardIds = allAccessibleBoards.map(b => b._id);
    } else {
      const allAccessibleBoards = await Board.find({}, '_id');
      accessibleBoardIds = allAccessibleBoards.map(b => b._id);
    }

    const tasks = await Task.find({
      board: { $in: accessibleBoardIds },
      $or: [{ title: regex }, { description: regex }]
    })
      .populate('board', 'name')
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        boards,
        tasks
      }
    });
  } catch (err) {
    next(err);
  }
};
