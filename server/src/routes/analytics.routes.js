import { Router } from 'express';
import {
  getChannelAnalytics,
  getVideoAnalytics,
  getAudienceAnalytics,
} from '../controllers/analytics.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect); // All analytics routes require auth

router.get('/channel', getChannelAnalytics);
router.get('/video/:videoId', getVideoAnalytics);
router.get('/audience', getAudienceAnalytics);

export default router;
