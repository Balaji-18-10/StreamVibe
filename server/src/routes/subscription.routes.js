import { Router } from 'express';
import {
  toggleSubscription,
  getSubscriptionStatus,
  getSubscribedChannels,
  getChannelSubscribers,
  updateNotificationLevel,
} from '../controllers/subscription.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/:channelId', protect, toggleSubscription);
router.get('/:channelId/status', optionalAuth, getSubscriptionStatus);
router.get('/me/channels', protect, getSubscribedChannels);
router.get('/:channelId/subscribers', getChannelSubscribers);
router.patch('/:channelId/notifications', protect, updateNotificationLevel);

export default router;
