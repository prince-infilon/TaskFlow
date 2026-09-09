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

const User = require('../models/User');
const Organization = require('../models/Organization');
const Session = require('../models/Session');
const bcrypt = require('bcrypt');
const { logActivity } = require('../services/activityService');
const { broadcastUserEvent } = require('../socket');

/**
 * GET /api/users
 * Strict hierarchical listing:
 * - Admin: can view all users, filtered by role, status, search, or managerId.
 * - Manager: can ONLY view members where managerId === req.user._id.
 * - Member: forbidden (403).
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, search, managerId } = req.query;
    let query = {};

    if (req.user.globalRole === 'admin') {
      if (role && ['admin', 'manager', 'member'].includes(role)) {
        query.globalRole = role;
      }
      if (status && ['active', 'inactive'].includes(status)) {
        query.isActive = status === 'active';
      }
      if (managerId) {
        query.managerId = managerId;
      }
      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [{ name: regex }, { email: regex }];
      }
    } else if (req.user.globalRole === 'manager') {
      // Strictly scoped to own members ONLY
      query = {
        globalRole: 'member',
        managerId: req.user._id
      };

      if (status && ['active', 'inactive'].includes(status)) {
        query.isActive = status === 'active';
      }
      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$and = [
          { globalRole: 'member', managerId: req.user._id },
          { $or: [{ name: regex }, { email: regex }] }
        ];
      }
    } else {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden: You do not have access to user management.' }
      });
    }

    const users = await User.find(query)
      .populate('managerId', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { users }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/managers
 * Admin helper to get list of active managers for dropdowns and counts
 */
exports.getActiveManagers = async (req, res, next) => {
  try {
    const managers = await User.find({
      globalRole: 'manager',
      isActive: true
    })
      .select('_id name email avatarUrl')
      .lean();

    // Attach member counts for each manager
    const managerIds = managers.map(m => m._id);
    const memberCounts = await User.aggregate([
      { $match: { managerId: { $in: managerIds } } },
      { $group: { _id: '$managerId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    memberCounts.forEach(c => {
      countMap[c._id.toString()] = c.count;
    });

    const managersWithCounts = managers.map(m => ({
      ...m,
      memberCount: countMap[m._id.toString()] || 0
    }));

    res.status(200).json({
      success: true,
      data: { managers: managersWithCounts }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:userId
 * Get target user details (enforced by authorizeTargetUser middleware)
 */
exports.getUserById = async (req, res) => {
  const user = await User.findById(req.targetUser._id).populate('managerId', 'name email avatarUrl');
  res.status(200).json({
    success: true,
    data: { user }
  });
};

/**
 * POST /api/users
 * Provision account with hierarchical ownership rules
 */
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    let targetRole = req.body.role || 'member';
    let assignedManagerId = req.body.managerId || null;

    if (req.user.globalRole === 'manager') {
      // Manager can ONLY create Members assigned to themselves
      if (req.body.role && req.body.role !== 'member') {
        return res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Managers can only create Member accounts.' }
        });
      }
      targetRole = 'member';
      assignedManagerId = req.user._id;
    } else if (req.user.globalRole === 'admin') {
      if (targetRole === 'member') {
        if (!assignedManagerId) {
          return res.status(400).json({
            success: false,
            error: { message: 'A Manager must be assigned when creating a Member.' }
          });
        }
        const managerExists = await User.findOne({ _id: assignedManagerId, globalRole: 'manager' });
        if (!managerExists) {
          return res.status(400).json({
            success: false,
            error: { message: 'Selected Manager does not exist or is not a Manager.' }
          });
        }
      } else {
        assignedManagerId = null;
      }
    } else {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Insufficient privileges to create users.' }
      });
    }

    // Check unique email
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { message: 'An account with this email already exists.' }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      globalRole: targetRole,
      managerId: assignedManagerId,
      isActive: true
    });

    await newUser.save();

    // Auto-provision to current organization if organization context is present
    const orgId = req.headers['x-organization-id'] || req.organization?._id;
    if (orgId) {
      const org = await Organization.findById(orgId);
      if (org) {
        const isMember = org.members.some(m => m.user.toString() === newUser._id.toString());
        if (!isMember) {
          org.members.push({ user: newUser._id, role: targetRole });
          await org.save();
        }
      }
    }

    // Log Activity
    await logActivity({
      userId: req.user._id,
      action: 'user_created',
      entityType: 'user',
      entityId: newUser._id,
      metadata: {
        createdUserName: newUser.name,
        createdUserEmail: newUser.email,
        createdUserRole: newUser.globalRole,
        managerId: newUser.managerId
      }
    });

    // Real-time notification
    broadcastUserEvent('user_created', {
      user: newUser,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: { user: newUser }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:userId
 * Update user details (name)
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (name) req.targetUser.name = name.trim();

    await req.targetUser.save();

    await logActivity({
      userId: req.user._id,
      action: 'user_updated',
      entityType: 'user',
      entityId: req.targetUser._id,
      metadata: { updatedFields: { name } }
    });

    broadcastUserEvent('user_updated', { user: req.targetUser });

    res.status(200).json({
      success: true,
      data: { user: req.targetUser }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:userId/reassign
 * Reassign Member to another Manager (Admin-only)
 */
exports.reassignMember = async (req, res, next) => {
  try {
    const { managerId } = req.body;

    if (req.targetUser.globalRole !== 'member') {
      return res.status(400).json({
        success: false,
        error: { message: 'Only Member accounts can be reassigned to a Manager.' }
      });
    }

    const newManager = await User.findOne({
      _id: managerId,
      globalRole: 'manager',
      isActive: true
    });

    if (!newManager) {
      return res.status(400).json({
        success: false,
        error: { message: 'Selected manager does not exist or is not active.' }
      });
    }

    const oldManagerId = req.targetUser.managerId;
    req.targetUser.managerId = newManager._id;
    await req.targetUser.save();

    await logActivity({
      userId: req.user._id,
      action: 'user_reassigned',
      entityType: 'user',
      entityId: req.targetUser._id,
      metadata: {
        memberName: req.targetUser.name,
        oldManagerId,
        newManagerId: newManager._id,
        newManagerName: newManager.name
      }
    });

    broadcastUserEvent('user_reassigned', {
      memberId: req.targetUser._id,
      oldManagerId,
      newManagerId: newManager._id
    });

    res.status(200).json({
      success: true,
      data: {
        user: req.targetUser,
        message: `Member reassigned to ${newManager.name} successfully.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:userId/status
 * Toggle user active/inactive status (with self-deactivation guard)
 */
exports.toggleUserStatus = async (req, res, next) => {
  try {
    if (req.targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: { message: 'You cannot deactivate your own account.' }
      });
    }

    req.targetUser.isActive = !req.targetUser.isActive;
    await req.targetUser.save();

    // Revoke active sessions if deactivated
    if (!req.targetUser.isActive) {
      await Session.deleteMany({ user: req.targetUser._id });
    }

    const action = req.targetUser.isActive ? 'user_activated' : 'user_deactivated';

    await logActivity({
      userId: req.user._id,
      action,
      entityType: 'user',
      entityId: req.targetUser._id,
      metadata: { isActive: req.targetUser.isActive }
    });

    broadcastUserEvent('user_updated', { user: req.targetUser });

    res.status(200).json({
      success: true,
      data: {
        user: req.targetUser,
        message: `User ${req.targetUser.isActive ? 'activated' : 'deactivated'} successfully.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/:userId/reset-password
 * Reset user password (Admin for any, Manager for own members)
 */
exports.resetUserPassword = async (req, res, next) => {
  try {
    const password = req.body.password || req.body.newPassword;
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 6 characters long.' }
      });
    }
    const passwordHash = await bcrypt.hash(password, 10);

    req.targetUser.passwordHash = passwordHash;
    req.targetUser.failedLoginAttempts = 0;
    req.targetUser.lockUntil = undefined;
    await req.targetUser.save();

    // Revoke all existing sessions so old tokens become invalid
    await Session.deleteMany({ user: req.targetUser._id });

    await logActivity({
      userId: req.user._id,
      action: 'password_reset',
      entityType: 'user',
      entityId: req.targetUser._id,
      metadata: { targetUserEmail: req.targetUser.email }
    });

    res.status(200).json({
      success: true,
      data: { message: 'Password has been reset successfully.' }
    });
  } catch (error) {
    next(error);
  }
};

