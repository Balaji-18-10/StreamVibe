import Notification from '../models/Notification.model.js';
import { asyncHandler, sendSuccess, getPagination, buildPaginationMeta } from '../utils/apiHelpers.js';

// GET /api/v1/notifications
export const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { filter } = req.query; // 'unread' | 'all'

  const query = { recipient: req.user._id };
  if (filter === 'unread') {
    query.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username displayName avatar'),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  return sendSuccess(res, {
    notifications,
    unreadCount,
    pagination: buildPaginationMeta(total, page, limit),
  });
});

// PATCH /api/v1/notifications/:id/read
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findOne({
    _id: id,
    recipient: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found.' });
  }

  notification.isRead = true;
  await notification.save();

  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

  return sendSuccess(res, { notification, unreadCount }, 'Notification marked as read');
});

// PATCH /api/v1/notifications/read-all
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );

  return sendSuccess(res, { unreadCount: 0 }, 'All notifications marked as read');
});

// DELETE /api/v1/notifications/:id
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findOne({
    _id: id,
    recipient: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found.' });
  }

  await notification.deleteOne();
  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

  return sendSuccess(res, { unreadCount }, 'Notification deleted');
});
