const Task = require('../models/Task');
const Column = require('../models/Column');
const Comment = require('../models/Comment');
const Attachment = require('../models/Attachment');
const { logActivity } = require('../services/activityService');
const { broadcastBoardEvent } = require('../socket');
const fs = require('fs');
const path = require('path');
const { evaluateAutomations } = require('../services/automationService');

// Escape user input for safe use inside a RegExp
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.getTasks = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { search, assignee, priority, dueDate, page, limit } = req.query;

    const filter = { board: boardId };

    // Members should strictly ONLY see tasks assigned to them
    if (req.user.globalRole === 'member' || req.boardRole === 'member') {
      filter.assignee = req.user._id;
    }

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

    // Members MUST strictly ONLY see tasks assigned to themselves
    if ((req.user.globalRole === 'member' || req.boardRole === 'member') && req.user.globalRole !== 'admin') {
      filter.assignee = req.user._id;
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
    const { column, title, description, startDate, dueDate, assignee, priority, position, subtasks } = req.body;

    // Members cannot create tasks
    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: Members cannot create tasks.' } });
    }

    // Validate required fields early
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Task title is required.' } });
    }

    // Validate column belongs to board
    const colExists = await Column.findOne({ _id: column, board: boardId });
    if (!colExists) {
      return res.status(400).json({ success: false, error: { message: 'Invalid column' } });
    }

    // If assignee provided, automatically include them in board members if not present
    if (assignee) {
      const isMember = req.board.members.find(m => m.user.toString() === assignee.toString());
      if (!isMember) {
        req.board.members.push({ user: assignee, role: 'member' });
        await req.board.save();
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
      startDate: startDate || '',
      dueDate: dueDate || '',
      assignee: assignee || null,
      priority: priority || 'low',
      position: pos,
      subtasks: Array.isArray(subtasks) ? subtasks : [],
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

    // Send real-time notification if task was assigned to someone else
    if (assignee && assignee.toString() !== req.user._id.toString()) {
      try {
        const { notifyUser } = require('../services/notificationService');
        await notifyUser({
          recipientId: assignee,
          senderId: req.user._id,
          boardId,
          taskId: task._id,
          type: 'task_assigned',
          title: 'Task Assigned',
          message: `${req.user.name} assigned you to task "${task.title}"`,
          targetSection: 'details'
        });
      } catch (notifErr) {
        console.error('Task assignment notification error:', notifErr);
      }
    }

    // Trigger automations without blocking
    evaluateAutomations('task_created', task, { userId: req.user._id });

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

    if ((req.user.globalRole === 'member' || req.boardRole === 'member') && req.user.globalRole !== 'admin') {
      const taskAssigneeId = task.assignee?._id?.toString() || task.assignee?.toString();
      if (taskAssigneeId !== req.user._id.toString()) {
        return res.status(404).json({ success: false, error: { message: 'Task not found' } });
      }
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

    // RBAC logic for members: can only update status/subtasks for assigned tasks, cannot edit task details
    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
      
      if (!isAssignee) {
        return res.status(403).json({ success: false, error: { message: 'Forbidden: You can only update tasks assigned to you' } });
      }

      const restrictedKeys = ['title', 'description', 'startDate', 'dueDate', 'assignee', 'priority'];
      const attemptedRestricted = Object.keys(updates).some(k => 
        restrictedKeys.includes(k) && 
        updates[k] !== undefined && 
        updates[k] !== task[k]?.toString() && 
        updates[k] !== task[k]
      );

      if (attemptedRestricted) {
        return res.status(403).json({ success: false, error: { message: 'Forbidden: Members cannot edit task details (title, description, dates, priority, assignee)' } });
      }
    }

    // If new assignee provided, automatically include them in board members if not present
    if (updates.assignee && updates.assignee !== task.assignee?.toString()) {
      const isMember = req.board.members.find(m => m.user.toString() === updates.assignee.toString());
      if (!isMember) {
        req.board.members.push({ user: updates.assignee, role: 'member' });
        await req.board.save();
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
      if (['title', 'description', 'startDate', 'dueDate', 'assignee', 'priority', 'column', 'position', 'subtasks'].includes(key)) {
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

      if (newAssignee !== req.user._id.toString()) {
        try {
          const { notifyUser } = require('../services/notificationService');
          await notifyUser({
            recipientId: newAssignee,
            senderId: req.user._id,
            boardId,
            taskId: task._id,
            type: 'task_assigned',
            title: 'Task Assigned',
            message: `${req.user.name} assigned you to task "${task.title}"`,
            targetSection: 'details'
          });
        } catch (notifErr) {
          console.error('Task re-assignment notification error:', notifErr);
        }
      }
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
    const column = req.body.column || req.body.columnId;
    const { position } = req.body;

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

    // Trigger automations without blocking
    evaluateAutomations('task_moved', task, { userId: req.user._id });

    res.status(200).json({ success: true, data: { task: populatedTask } });
  } catch (error) {
    next(error);
  }
};
