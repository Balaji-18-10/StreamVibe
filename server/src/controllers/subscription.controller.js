import Subscription from '../models/Subscription.model.js';
import User from '../models/User.model.js';
import { asyncHandler, sendSuccess, getPagination, buildPaginationMeta } from '../utils/apiHelpers.js';
import { createNotification } from '../utils/notificationHelper.js';

// POST /api/v1/subscriptions/:channelId
export const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (channelId.toString() === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot subscribe to your own channel.' });
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    return res.status(404).json({ success: false, message: 'Channel not found.' });
  }

  const existing = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (existing) {
    // Unsubscribe
    await existing.deleteOne();
    const updatedChannel = await User.findByIdAndUpdate(
      channelId,
      { $inc: { subscriberCount: -1 } },
      { new: true }
    );

    return sendSuccess(res, {
      subscribed: false,
      subscriberCount: Math.max(0, updatedChannel?.subscriberCount || 0),
    }, 'Unsubscribed from channel');
  } else {
    // Subscribe
    await Subscription.create({
      subscriber: req.user._id,
      channel: channelId,
      notificationLevel: 'all',
    });

    const updatedChannel = await User.findByIdAndUpdate(
      channelId,
      { $inc: { subscriberCount: 1 } },
      { new: true }
    );

    // Notify channel creator
    await createNotification({
      recipient: channelId,
      sender: req.user._id,
      type: 'new_subscriber',
      entityType: 'User',
      entityId: req.user._id,
      message: `${req.user.displayName || req.user.username} subscribed to your channel.`,
    });

    return sendSuccess(res, {
      subscribed: true,
      subscriberCount: Math.max(0, updatedChannel?.subscriberCount || 0),
    }, 'Subscribed to channel');
  }
});

// GET /api/v1/subscriptions/:channelId/status
export const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!req.user) {
    return sendSuccess(res, { subscribed: false, notificationLevel: null });
  }

  const subscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  return sendSuccess(res, {
    subscribed: !!subscription,
    notificationLevel: subscription?.notificationLevel || null,
  });
});

// GET /api/v1/subscriptions/me/channels
export const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const query = { subscriber: req.user._id };
  const [subscriptions, total] = await Promise.all([
    Subscription.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('channel', 'username displayName avatar subscriberCount videoCount bio'),
    Subscription.countDocuments(query),
  ]);

  const channels = subscriptions
    .filter((s) => s.channel)
    .map((s) => {
      const channelObj = s.channel.toObject ? s.channel.toObject() : s.channel;
      return {
        ...channelObj,
        subscriptionId: s._id,
        notificationLevel: s.notificationLevel || 'all',
        subscribedAt: s.createdAt,
      };
    });

  return sendSuccess(res, {
    channels,
    pagination: buildPaginationMeta(total, page, limit),
  });
});

// GET /api/v1/subscriptions/:channelId/subscribers
export const getChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { page, limit, skip } = getPagination(req.query);

  const channel = await User.findById(channelId, '_id');
  if (!channel) {
    return res.status(404).json({ success: false, message: 'Channel not found.' });
  }

  const query = { channel: channelId };
  const [subscriptions, total] = await Promise.all([
    Subscription.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('subscriber', 'username displayName avatar subscriberCount'),
    Subscription.countDocuments(query),
  ]);

  const subscribers = subscriptions.map((s) => s.subscriber).filter(Boolean);

  return sendSuccess(res, {
    subscribers,
    pagination: buildPaginationMeta(total, page, limit),
  });
});

// PATCH /api/v1/subscriptions/:channelId/notifications
export const updateNotificationLevel = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { level } = req.body;

  const validLevels = ['all', 'highlights', 'none'];
  if (!validLevels.includes(level)) {
    return res.status(400).json({ success: false, message: `Notification level must be one of: ${validLevels.join(', ')}` });
  }

  const subscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (!subscription) {
    return res.status(404).json({ success: false, message: 'You are not subscribed to this channel.' });
  }

  subscription.notificationLevel = level;
  await subscription.save();

  return sendSuccess(res, { notificationLevel: level }, 'Notification preference updated');
});
