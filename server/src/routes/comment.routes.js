import { Router } from 'express';
import {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
  getReplies,
  pinComment,
} from '../controllers/comment.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/video/:videoId', getVideoComments);
router.get('/:commentId/replies', getReplies);
router.post('/video/:videoId', protect, addComment);
router.patch('/:commentId', protect, updateComment);
router.delete('/:commentId', protect, deleteComment);
router.patch('/:commentId/pin', protect, pinComment);

export default router;
