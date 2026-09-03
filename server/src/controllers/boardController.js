const Board = require('../models/Board');
const User = require('../models/User');
const Column = require('../models/Column');
const { logActivity } = require('../services/activityService');
const { broadcastBoardEvent } = require('../socket');

exports.createBoard = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    const board = new Board({
      name,
      description,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'manager' }]
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

    res.status(201).json({ success: true, data: { board } });
  } catch (error) {
    next(error);
  }
};

exports.getBoards = async (req, res, next) => {
  try {
    // If admin, they technically could see all boards, but for now we'll fetch boards they are a member of
    // Admin global access is handled per-board usually, but listing can just return joined boards
    // unless admin explicitly wants all. We'll default to joined boards.
    const query = req.user.globalRole === 'admin' && req.query.all === 'true' 
      ? {} 
      : { 'members.user': req.user._id };

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
    res.status(200).json({ success: true, data: { board } });
  } catch (error) {
    next(error);
  }
};

exports.updateBoard = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const board = req.board;

    if (name !== undefined) board.name = name;
    if (description !== undefined) board.description = description;

    await board.save();
    res.status(200).json({ success: true, data: { board } });
  } catch (error) {
    next(error);
  }
};

exports.deleteBoard = async (req, res, next) => {
  try {
    const board = req.board;
    await Board.deleteOne({ _id: board._id });
    res.status(200).json({ success: true, data: { message: 'Board deleted successfully.' } });
  } catch (error) {
    next(error);
  }
};

// Members Management
exports.addMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const board = req.board;

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
