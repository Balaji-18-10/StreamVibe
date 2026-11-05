import Notification from '../models/Notification.model.js';
import { getIO } from '../config/socket.js';
import logger from './logger.js';

/**
 * Creates a notification in MongoDB and emits it via Socket.IO if recipient is online.
 * Skips notification creation when the action is performed on one's own content.
 *
 * @param {object} params
 * @param {mongoose.Types.ObjectId|string} params.recipient - User receiving the notification
 * @param {mongoose.Types.ObjectId|string} params.sender - User triggering the action
 * @param {string} params.type - 'new_video' | 'new_comment' | 'comment_reply' | 'like' | 'new_subscriber' | 'live_start'
 * @param {string} [params.entityType] - 'Video' | 'Comment' | 'User'
 * @param {mongoose.Types.ObjectId|string} [params.entityId] - Associated entity ID
 * @param {string} [params.message] - Optional custom message
 * @returns {Promise<object|null>}
 */
export const createNotification = async ({
  recipient,
  sender,
  type,
  entityType = null,
  entityId = null,
  message = '',
}) => {
  try {
    if (!recipient || !sender) return null;
    if (recipient.toString() === sender.toString()) return null;

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      entityType,
      entityId,
      message,
    });

    const populated = await Notification.findById(notification._id)
      .populate('sender', 'username displayName avatar');

    // Emit Socket.IO real-time event if socket is running
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${recipient}`).emit('notification', populated);
      }
    } catch {
      // Socket.IO may not be initialized in background workers or test environments
    }

    return populated;
  } catch (error) {
    logger.error('Failed to create notification:', error.message);
    return null;
  }
};
