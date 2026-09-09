const Notification = require('../models/Notification');
const { sendUserNotification, broadcastBoardEvent } = require('../socket');

/**
 * Dispatch a notification to a specific user and broadcast real-time socket event.
 */
exports.notifyUser = async ({
  recipientId,
  senderId,
  boardId,
  taskId = null,
  type,
  title,
  message,
  targetSection = 'details'
}) => {
  try {
    // Avoid sending self-notifications
    if (recipientId.toString() === senderId.toString()) return null;

    const notif = new Notification({
      recipient: recipientId,
      sender: senderId,
      board: boardId,
      task: taskId,
      type,
      title,
      message,
      targetSection
    });

    await notif.save();
    await notif.populate('sender', 'name email avatarUrl');

    const payload = {
      _id: notif._id,
      id: notif._id,
      recipient: recipientId,
      sender: notif.sender,
      board: boardId,
      task: taskId,
      type,
      title,
      message,
      targetSection,
      isRead: false,
      createdAt: notif.createdAt
    };

    // Emit live to the recipient's socket room
    sendUserNotification(recipientId, 'notification_received', payload);

    return notif;
  } catch (err) {
    console.error('Failed to dispatch notification:', err);
    return null;
  }
};

/**
 * Notify multiple users at once (e.g. all members of a board).
 */
exports.notifyMultipleUsers = async ({
  recipientIds = [],
  senderId,
  boardId,
  taskId = null,
  type,
  title,
  message,
  targetSection = 'details'
}) => {
  try {
    const uniqueRecipients = [...new Set(recipientIds.map(id => id.toString()))]
      .filter(id => id !== senderId.toString());

    const promises = uniqueRecipients.map(recipientId => 
      exports.notifyUser({
        recipientId,
        senderId,
        boardId,
        taskId,
        type,
        title,
        message,
        targetSection
      })
    );

    return await Promise.all(promises);
  } catch (err) {
    console.error('Failed to dispatch multiple notifications:', err);
    return [];
  }
};
