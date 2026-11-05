import { Router } from 'express';
import {
  getChannel,
  updateProfile,
  updateAvatar,
  updateBanner,
  deleteAccount,
  getWatchHistory,
  removeFromWatchHistory,
  clearWatchHistory,
  getUserPlaylists,
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { avatarUpload, bannerUpload } from '../middleware/upload.middleware.js';

const router = Router();

// Protected profile & account routes (registered before /:username)
router.patch('/me/profile', protect, updateProfile);
router.patch('/me/avatar', protect, avatarUpload, updateAvatar);
router.patch('/me/banner', protect, bannerUpload, updateBanner);
router.delete('/me', protect, deleteAccount);
router.get('/me/history', protect, getWatchHistory);
router.delete('/me/history/:videoId', protect, removeFromWatchHistory);
router.delete('/me/history', protect, clearWatchHistory);

// Public channel page
router.get('/:username', getChannel);
router.get('/:username/playlists', getUserPlaylists);

export default router;
