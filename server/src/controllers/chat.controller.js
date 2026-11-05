import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage.model.js';
import Video from '../models/Video.model.js';
import { asyncHandler, sendSuccess } from '../utils/apiHelpers.js';

/**
 * Retrieve recent chat history for a video/live stream via REST API.
 * GET /api/v1/videos/:id/chat
 */
export const getVideoChatHistory = asyncHandler(async (req, res) => {
  const { id: videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ success: false, message: 'Invalid video ID format.' });
  }

  const video = await Video.findById(videoId).select('visibility owner');
  if (!video) {
    return res.status(404).json({ success: false, message: 'Video not found.' });
  }

  // Enforce private video access controls
  if (video.visibility === 'private') {
    const isOwner = req.user && req.user._id.toString() === video.owner.toString();
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'This chat is private.' });
    }
  }

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const messages = await ChatMessage.find({ video: videoId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'username displayName avatar')
    .lean();

  return sendSuccess(
    res,
    {
      messages: messages.reverse(),
      total: messages.length,
    },
    'Chat history retrieved successfully.'
  );
});
