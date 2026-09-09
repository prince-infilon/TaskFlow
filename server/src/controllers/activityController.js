const Activity = require('../models/Activity');
const Board = require('../models/Board');

exports.getBoardActivity = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 50;

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    const skip = (page - 1) * limit;

    const activities = await Activity.find({ board: boardId })
      .populate('user', 'name email avatarUrl')
      .populate('board', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments({ board: boardId });

    res.status(200).json({
      success: true,
      data: {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getGlobalActivity = async (req, res, next) => {
  try {
    const { boardId, entityType, action, search } = req.query;
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 50;

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;
    const skip = (page - 1) * limit;

    // 1. Find all accessible boards for the current user
    let boardQuery = {};
    const orgId = req.headers['x-organization-id'] || req.organization?._id;
    if (orgId) {
      boardQuery.organization = orgId;
    }

    if (req.user.globalRole !== 'admin') {
      boardQuery.$or = [
        { 'members.user': req.user._id },
        { owner: req.user._id }
      ];
    }

    const accessibleBoards = await Board.find(boardQuery, '_id name');
    const accessibleBoardIds = accessibleBoards.map(b => b._id);

    // 2. Build activity query
    let query = {};
    if (boardId) {
      query.board = boardId;
    } else {
      query.$or = [
        { board: { $in: accessibleBoardIds } },
        { board: { $exists: false } },
        { board: null }
      ];
    }

    if (entityType) {
      query.entityType = entityType;
    }

    if (action) {
      query.action = action;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { 'metadata.taskTitle': regex },
        { 'metadata.boardName': regex },
        { 'metadata.originalFilename': regex },
        { 'metadata.addedEmail': regex }
      ];
    }

    const activities = await Activity.find(query)
      .populate('user', 'name email avatarUrl')
      .populate('board', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments(query);

    // 3. Compute summary statistics
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const statsTodayQuery = { ...query, createdAt: { $gte: startOfToday } };
    const totalToday = await Activity.countDocuments(statsTodayQuery);
    const tasksMovedToday = await Activity.countDocuments({ ...statsTodayQuery, action: 'task_moved' });
    const commentsToday = await Activity.countDocuments({ ...statsTodayQuery, action: 'comment_created' });

    res.status(200).json({
      success: true,
      data: {
        activities,
        boards: accessibleBoards,
        stats: {
          totalToday,
          tasksMovedToday,
          commentsToday,
          totalAllTime: total
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

