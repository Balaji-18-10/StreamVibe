import { Router } from 'express';
import {
  createPlaylist,
  getUserPlaylists,
  getMyPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  reorderPlaylist,
  getWatchLaterPlaylist,
  addToWatchLater,
  removeFromWatchLater,
} from '../controllers/playlist.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Current user custom playlists
router.get('/me', protect, getMyPlaylists);

// System playlist: Watch Later (must be before /:playlistId)
router.get('/system/watch-later', protect, getWatchLaterPlaylist);
router.post('/system/watch-later/videos', protect, addToWatchLater);
router.delete('/system/watch-later/videos/:videoId', protect, removeFromWatchLater);

// Standard playlist routes
router.post('/', protect, createPlaylist);
router.get('/user/:userId', optionalAuth, getUserPlaylists);
router.get('/:playlistId', optionalAuth, getPlaylistById);
router.patch('/:playlistId', protect, updatePlaylist);
router.delete('/:playlistId', protect, deletePlaylist);
router.post('/:playlistId/videos', protect, addVideoToPlaylist);
router.delete('/:playlistId/videos/:videoId', protect, removeVideoFromPlaylist);
router.patch('/:playlistId/reorder', protect, reorderPlaylist);

export default router;
