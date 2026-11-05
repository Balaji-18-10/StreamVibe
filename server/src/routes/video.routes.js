import { Router } from 'express';
import {
  uploadVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  incrementView,
  getTrendingVideos,
  getShorts,
  getRecommendedVideos,
  getChannelVideos,
  getMyVideos,
} from '../controllers/video.controller.js';
import { getVideoChatHistory } from '../controllers/chat.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';
import { videoUploadFields, thumbnailUpload } from '../middleware/upload.middleware.js';

const router = Router();

// Protected — creator studio videos (must be before /:id)
router.get('/studio/my-videos', protect, getMyVideos);

// Public
router.get('/', getAllVideos);
router.get('/trending', getTrendingVideos);
router.get('/shorts', getShorts);
router.get('/:id', optionalAuth, getVideoById);
router.get('/:id/recommended', optionalAuth, getRecommendedVideos);
router.get('/:id/chat', optionalAuth, getVideoChatHistory);
router.post('/:id/view', optionalAuth, incrementView);

// Channel videos
router.get('/channel/:username', getChannelVideos);

// Protected — creator actions
router.post('/upload', protect, videoUploadFields, uploadVideo);
router.patch('/:id', protect, thumbnailUpload, updateVideo);
router.delete('/:id', protect, deleteVideo);

export default router;
