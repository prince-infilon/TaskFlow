const Board = require('../models/Board');
const User = require('../models/User');
const Column = require('../models/Column');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const Attachment = require('../models/Attachment');
const Activity = require('../models/Activity');
const { logActivity } = require('../services/activityService');
const { broadcastBoardEvent, broadcastUserEvent } = require('../socket');
const { checkBoardLimit } = require('../services/limitService');

exports.createBoard = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const orgId = req.organization._id;

    // Enforce tier limits
    await checkBoardLimit(orgId);

    const initialMembers = [
      { user: req.user._id, role: req.user.globalRole === 'admin' ? 'admin' : 'manager' }
    ];

    const board = new Board({
      name,
      description,
      organizationId: req.organization._id,
      owner: req.user._id,
      members: initialMembers
    });

    await board.save();

    await Column.insertMany([
      { board: board._id, name: 'To Do', position: 0 },
      { board: board._id, name: 'In Progress', position: 1 },
      { board: board._id, name: 'Done', position: 2 }
    ]);
    
    await logActivity({
      boardId: board._id,
      userId: req.user._id,
      action: 'board_created',
      entityType: 'board',
      entityId: board._id,
      metadata: { boardName: board.name }
    });

    broadcastUserEvent('board_created', { board });
    res.status(201).json({ success: true, data: { board } });
  } catch (error) {
    next(error);
  }
};

exports.getBoards = async (req, res, next) => {
  try {
    let query;
    if (req.orgRole === 'admin' || req.user.globalRole === 'admin') {
      query = { organizationId: req.organization._id };
    } else if (req.user.globalRole === 'member') {
      // Members strictly ONLY see boards where they have assigned tasks or are board owner
      const assignedTaskBoards = await Task.distinct('board', { assignee: req.user._id });
      query = {
        organizationId: req.organization._id,
        $or: [
          { owner: req.user._id },
          { _id: { $in: assignedTaskBoards } }
        ]
      };
    } else {
      const assignedTaskBoards = await Task.distinct('board', { assignee: req.user._id });

      const orConditions = [
        { owner: req.user._id },
        { 'members.user': req.user._id },
        { _id: { $in: assignedTaskBoards } }
      ];

      if (req.user.managerId) {
        orConditions.push({ owner: req.user.managerId });
      }

      query = {
        organizationId: req.organization._id,
        $or: orConditions
      };
    }

    const boards = await Board.find(query)
      .select('-members') // Exclude members list for overview
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: { boards } });
  } catch (error) {
    next(error);
  }
};

exports.getBoardById = async (req, res, next) => {
  try {
    // Board is already loaded securely by authorizeBoard middleware
    const board = req.board;
    res.status(200).json({ success: true, data: { board, organization: req.organization } });
  } catch (error) {
    next(error);
  }
};

exports.updateBoard = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const board = req.board;

    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: Members cannot edit boards.' } });
    }

    if (name !== undefined) board.name = name;
    if (description !== undefined) board.description = description;

    await board.save();
    broadcastBoardEvent(board._id, 'board_updated', { board });
    broadcastUserEvent('board_updated', { board });
    res.status(200).json({ success: true, data: { board } });
  } catch (error) {
    next(error);
  }
};

exports.deleteBoard = async (req, res, next) => {
  try {
    const board = req.board;
    const boardId = board._id;

    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: Members cannot delete boards.' } });
    }

    // Find all tasks belonging to this board
    const tasks = await Task.find({ board: boardId }).select('_id');
    const taskIds = tasks.map(t => t._id);

    if (taskIds.length > 0) {
      await Comment.deleteMany({ task: { $in: taskIds } });
      await Attachment.deleteMany({ task: { $in: taskIds } });
      await Task.deleteMany({ board: boardId });
    }

    await Column.deleteMany({ board: boardId });
    await Activity.deleteMany({ boardId: boardId });
    await Board.deleteOne({ _id: boardId });

    broadcastBoardEvent(boardId, 'board_deleted', { boardId });
    broadcastUserEvent('board_deleted', { boardId });
    res.status(200).json({ success: true, data: { message: 'Board and all associated tasks deleted successfully.' } });
  } catch (error) {
    next(error);
  }
};

// Members Management
exports.addMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const board = req.board;

    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: Members cannot add people to boards.' } });
    }

    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) {
      return res.status(404).json({ success: false, error: { message: 'User not found.' } });
    }

    const existingMember = board.members.find(m => m.user.toString() === userToAdd._id.toString());
    if (existingMember) {
      return res.status(409).json({ success: false, error: { message: 'User is already a member of this board.' } });
    }

    board.members.push({ user: userToAdd._id, role: role || 'member' });
    await board.save();

    await logActivity({
      boardId: board._id,
      userId: req.user._id,
      action: 'member_added',
      entityType: 'member',
      entityId: userToAdd._id,
      metadata: { addedEmail: userToAdd.email, role: role || 'member' }
    });

    broadcastBoardEvent(board._id, 'member_added', { userId: userToAdd._id, role: role || 'member', user: { _id: userToAdd._id, name: userToAdd.name, email: userToAdd.email, avatarUrl: userToAdd.avatarUrl } });
    res.status(200).json({ success: true, data: { board } });
  } catch (error) {
    next(error);
  }
};

exports.getMembers = async (req, res, next) => {
  try {
    const board = req.board;
    // Populate user details for the members array
    await board.populate('members.user', 'name email avatarUrl isActive');
    
    res.status(200).json({ success: true, data: { members: board.members } });
  } catch (error) {
    next(error);
  }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const board = req.board;

    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: Members cannot update member roles.' } });
    }

    const member = board.members.find(m => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({ success: false, error: { message: 'Member not found on this board.' } });
    }

    member.role = role;
    await board.save();

    await logActivity({
      boardId: board._id,
      userId: req.user._id,
      action: 'member_role_changed',
      entityType: 'member',
      entityId: userId,
      metadata: { newRole: role }
    });

    broadcastBoardEvent(board._id, 'member_role_changed', { userId, role });
    res.status(200).json({ success: true, data: { board } });
  } catch (error) {
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const board = req.board;

    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: Members cannot remove members from boards.' } });
    }

    const memberIndex = board.members.findIndex(m => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({ success: false, error: { message: 'Member not found on this board.' } });
    }

    // Optional: Prevent removing the owner, or prevent removing the last manager.
    if (board.owner.toString() === userId) {
      return res.status(403).json({ success: false, error: { message: 'Cannot remove the board owner.' } });
    }

    board.members.splice(memberIndex, 1);
    await board.save();

    await logActivity({
      boardId: board._id,
      userId: req.user._id,
      action: 'member_removed',
      entityType: 'member',
      entityId: userId,
      metadata: {}
    });

    broadcastBoardEvent(board._id, 'member_removed', { userId });
    res.status(200).json({ success: true, data: { message: 'Member removed successfully.' } });
  } catch (error) {
    next(error);
  }
};

exports.getBoardAnalytics = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    
    const tasks = await Task.find({ board: boardId })
      .populate('column', 'name')
      .populate('assignee', 'name email avatar');
    const columns = await Column.find({ board: boardId }).sort('position');

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.column && (t.column.name.toLowerCase().includes('done') || t.column.name.toLowerCase().includes('complete'))).length;
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const tasksByColumn = {};
    columns.forEach(c => {
      tasksByColumn[c.name] = tasks.filter(t => t.column && t.column._id.toString() === c._id.toString()).length;
    });

    const tasksByPriority = {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length
    };

    const tasksByAssignee = {};
    tasks.forEach(t => {
      const name = t.assignee ? t.assignee.name : 'Unassigned';
      tasksByAssignee[name] = (tasksByAssignee[name] || 0) + 1;
    });

    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.column && !t.column.name.toLowerCase().includes('done')).length;

    // Activity in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = await Activity.find({
      board: boardId,
      createdAt: { $gte: sevenDaysAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        completionRate,
        tasksByColumn,
        tasksByPriority,
        tasksByAssignee,
        overdueTasks,
        recentActivityCount: recentActivity.length
      }
    });
  } catch (error) {
    next(error);
  }
};
