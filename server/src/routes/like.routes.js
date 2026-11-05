import { Router } from 'express';
import { toggleLike, getLikeStatus, getLikedVideos } from '../controllers/like.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

// User liked videos list (must be before /:entityType/:entityId)
router.get('/videos', protect, getLikedVideos);

// entityType: 'video' | 'comment'
router.post('/:entityType/:entityId', protect, toggleLike);
router.get('/:entityType/:entityId', optionalAuth, getLikeStatus);

export default router;
