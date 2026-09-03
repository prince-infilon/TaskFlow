const Activity = require('../models/Activity');
const { broadcastBoardEvent } = require('../socket');

exports.logActivity = async ({ boardId, userId, action, entityType, entityId, metadata = {} }) => {
  try {
    const activity = new Activity({
      board: boardId,
      user: userId,
      action,
      entityType,
      entityId,
      metadata
    });
    // Fire and forget; do not await if we want to not block the request?
    // Wait, the instructions say: "activity creation failure must not accidentally make a successful primary operation appear failed unless the project architecture explicitly requires transactional behavior."
    // So we can catch internally and log an error to console, avoiding throwing it to the parent.
    await activity.save();
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};
