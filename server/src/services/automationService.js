const Automation = require('../models/Automation');
const Task = require('../models/Task');
const { broadcastBoardEvent } = require('../socket');
const { logActivity } = require('./activityService');

/**
 * Evaluate and execute automations based on a trigger event.
 * @param {string} trigger - e.g., 'task_moved', 'task_created'
 * @param {Object} task - The mongoose task document
 * @param {Object} context - Extra context (e.g., req.user._id)
 */
exports.evaluateAutomations = async (trigger, task, context = {}) => {
  try {
    const automations = await Automation.find({
      board: task.board,
      trigger: trigger,
      isActive: true
    });

    if (!automations || automations.length === 0) return;

    let hasUpdates = false;

    for (const automation of automations) {
      let isMatch = false;

      // Check conditions
      if (trigger === 'task_moved' || trigger === 'task_created') {
        if (automation.condition && automation.condition.columnId) {
          if (task.column.toString() === automation.condition.columnId.toString()) {
            isMatch = true;
          }
        } else {
          isMatch = true; // No specific condition, always match trigger
        }
      }

      if (isMatch) {
        // Execute action
        switch (automation.action) {
          case 'set_priority':
            if (automation.actionPayload && automation.actionPayload.priority) {
              task.priority = automation.actionPayload.priority;
              hasUpdates = true;
            }
            break;
          case 'mark_complete':
            // Mark all subtasks as complete
            if (task.subtasks && task.subtasks.length > 0) {
              task.subtasks = task.subtasks.map(st => ({ ...st.toObject(), isCompleted: true }));
              hasUpdates = true;
            }
            break;
          case 'unassign':
            task.assignee = null;
            hasUpdates = true;
            break;
        }
      }
    }

    if (hasUpdates) {
      await task.save();
      
      const populatedTask = await Task.findById(task._id).populate('assignee', 'name email avatarUrl');
      broadcastBoardEvent(task.board.toString(), 'task_updated', { task: populatedTask });
      
      if (context.userId) {
        await logActivity({
          boardId: task.board.toString(),
          userId: context.userId,
          action: 'automation_executed',
          entityType: 'task',
          entityId: task._id,
          metadata: { taskTitle: task.title }
        });
      }
    }

  } catch (error) {
    console.error('Automation execution failed:', error);
  }
};
