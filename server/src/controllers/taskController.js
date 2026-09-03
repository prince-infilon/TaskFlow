const Task = require('../models/Task');
const Column = require('../models/Column');
const Comment = require('../models/Comment');
const Attachment = require('../models/Attachment');
const { logActivity } = require('../services/activityService');
const { broadcastBoardEvent } = require('../socket');
const fs = require('fs');
const path = require('path');

// Escape user input for safe use inside a RegExp
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.getTasks = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { search, assignee, priority, dueDate, page, limit } = req.query;

    const filter = { board: boardId };

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const safeSearch = escapeRegex(search.trim().slice(0, 200));
      filter.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    if (assignee && typeof assignee === 'string') {
      if (assignee === 'unassigned') {
        filter.assignee = null;
      } else {
        // Split by comma, keep only valid mongo-id-looking strings
        const ids = assignee.split(',').filter(id => /^[a-f\d]{24}$/i.test(id.trim()));
        if (ids.length > 0) {
          filter.assignee = { $in: ids };
        }
      }
    }

    if (priority && typeof priority === 'string') {
      const allowedPriorities = ['low', 'medium', 'high'];
      const priorities = priority.split(',').filter(p => allowedPriorities.includes(p.trim().toLowerCase()));
      if (priorities.length > 0) {
        filter.priority = { $in: priorities };
      }
    }

    if (dueDate && typeof dueDate === 'string') {
      if (dueDate === 'overdue') {
        // True overdue filter for parseable dates (YYYY-MM-DD contract)
        const today = new Date().toISOString().split('T')[0];
        filter.dueDate = { 
          $regex: /^\d{4}-\d{2}-\d{2}$/,
          $lt: today 
        };
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        // Only accept valid YYYY-MM-DD date strings
        filter.dueDate = dueDate;
      }
      // Anything else (including objects, $operators) is silently ignored
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    let limitNum = parseInt(limit, 10) || 50;
    if (limitNum > 100) limitNum = 100;
    if (limitNum < 1) limitNum = 50;
    const skip = (pageNum - 1) * limitNum;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignee', 'name email avatarUrl')
        .sort({ position: 1 })
        .skip(skip)
        .limit(limitNum),
      Task.countDocuments(filter)
    ]);

    res.status(200).json({ 
      success: true, 
      data: { 
        tasks,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      } 
    });
  } catch (error) {
    next(error);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { column, title, description, dueDate, assignee, priority, position } = req.body;

    // Validate required fields early
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Task title is required.' } });
    }

    // Validate column belongs to board
    const colExists = await Column.findOne({ _id: column, board: boardId });
    if (!colExists) {
      return res.status(400).json({ success: false, error: { message: 'Invalid column' } });
    }

    // If assignee provided, validate they belong to board
    if (assignee) {
      const isMember = req.board.members.find(m => m.user.toString() === assignee);
      if (!isMember && req.user.globalRole !== 'admin') {
        return res.status(400).json({ success: false, error: { message: 'Assignee is not a member of this board' } });
      }
    }

    let pos = position;
    if (pos === undefined) {
      const lastTask = await Task.findOne({ column }).sort({ position: -1 });
      pos = lastTask ? lastTask.position + 1 : 0;
    }

    const task = new Task({
      board: boardId,
      column,
      title,
      description,
      dueDate,
      assignee: assignee || null,
      priority: priority || 'low',
      position: pos,
      createdBy: req.user._id
    });

    await task.save();
    
    await logActivity({
      boardId,
      userId: req.user._id,
      action: 'task_created',
      entityType: 'task',
      entityId: task._id,
      metadata: { taskTitle: task.title }
    });

    const populatedTask = await Task.findById(task._id).populate('assignee', 'name email avatarUrl');
    broadcastBoardEvent(boardId, 'task_created', { task: populatedTask });

    res.status(201).json({ success: true, data: { task: populatedTask } });
  } catch (error) {
    next(error);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    const { boardId, taskId } = req.params;
    const task = await Task.findOne({ _id: taskId, board: boardId }).populate('assignee', 'name email avatarUrl');
    
    if (!task) {
      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }
    
    res.status(200).json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { boardId, taskId } = req.params;
    const updates = req.body;

    const task = await Task.findOne({ _id: taskId, board: boardId });
    if (!task) {
      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }

    // RBAC logic for members: can only edit if they are the assignee
    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
      
      if (!isAssignee) {
        return res.status(403).json({ success: false, error: { message: 'Forbidden: You can only edit tasks assigned to you' } });
      }
    }

    // Validate new assignee if changed
    if (updates.assignee && updates.assignee !== task.assignee?.toString()) {
      const isMember = req.board.members.find(m => m.user.toString() === updates.assignee);
      if (!isMember && req.user.globalRole !== 'admin') {
        return res.status(400).json({ success: false, error: { message: 'Assignee is not a member of this board' } });
      }
    }

    // Validate new column if changed
    if (updates.column && updates.column !== task.column.toString()) {
      const colExists = await Column.findOne({ _id: updates.column, board: boardId });
      if (!colExists) {
        return res.status(400).json({ success: false, error: { message: 'Invalid target column' } });
      }
    }

    const oldAssignee = task.assignee?.toString();

    Object.keys(updates).forEach(key => {
      if (['title', 'description', 'dueDate', 'assignee', 'priority', 'column', 'position'].includes(key)) {
        task[key] = updates[key] === '' && key === 'assignee' ? null : updates[key];
      }
    });

    await task.save();
    
    const newAssignee = task.assignee?.toString();
    if (newAssignee && newAssignee !== oldAssignee) {
      await logActivity({
        boardId,
        userId: req.user._id,
        action: 'task_assigned',
        entityType: 'task',
        entityId: task._id,
        metadata: { taskTitle: task.title, assigneeId: newAssignee }
      });
    } else {
      await logActivity({
        boardId,
        userId: req.user._id,
        action: 'task_updated',
        entityType: 'task',
        entityId: task._id,
        metadata: { taskTitle: task.title }
      });
    }

    const populatedTask = await Task.findById(task._id).populate('assignee', 'name email avatarUrl');
    broadcastBoardEvent(boardId, 'task_updated', { task: populatedTask });

    res.status(200).json({ success: true, data: { task: populatedTask } });
  } catch (error) {
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const { boardId, taskId } = req.params;
    
    const task = await Task.findOne({ _id: taskId, board: boardId });
    if (!task) {
      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }

    // RBAC logic for members: cannot delete tasks at all
    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: Members cannot delete tasks' } });
    }

    // Clean up physical attachments
    const attachments = await Attachment.find({ task: taskId });
    for (const att of attachments) {
      const safePath = path.resolve(att.path);
      if (safePath.startsWith(path.resolve('uploads'))) {
        await fs.promises.unlink(safePath).catch(() => {});
      }
    }

    // Clean up from MongoDB
    await Attachment.deleteMany({ task: taskId });
    await Comment.deleteMany({ task: taskId });
    await Task.deleteOne({ _id: taskId });
    
    await logActivity({
      boardId,
      userId: req.user._id,
      action: 'task_deleted',
      entityType: 'task',
      entityId: taskId,
      metadata: { taskTitle: task.title }
    });

    broadcastBoardEvent(boardId, 'task_deleted', { taskId });
    res.status(200).json({ success: true, data: { message: 'Task deleted' } });
  } catch (error) {
    next(error);
  }
};

exports.moveTask = async (req, res, next) => {
  try {
    const { boardId, taskId } = req.params;
    const { column, position } = req.body;

    const task = await Task.findOne({ _id: taskId, board: boardId });
    if (!task) {
      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }

    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
      
      if (!isAssignee) {
        return res.status(403).json({ success: false, error: { message: 'Forbidden: You can only move tasks assigned to you' } });
      }
    }

    const colExists = await Column.findOne({ _id: column, board: boardId });
    if (!colExists) {
      return res.status(400).json({ success: false, error: { message: 'Invalid target column' } });
    }

    task.column = column;
    task.position = position;
    await task.save();

    await logActivity({
      boardId,
      userId: req.user._id,
      action: 'task_moved',
      entityType: 'task',
      entityId: task._id,
      metadata: { taskTitle: task.title, newColumnId: column }
    });

    const populatedTask = await Task.findById(task._id).populate('assignee', 'name email avatarUrl');
    broadcastBoardEvent(boardId, 'task_moved', { task: populatedTask });

    res.status(200).json({ success: true, data: { task: populatedTask } });
  } catch (error) {
    next(error);
  }
};
