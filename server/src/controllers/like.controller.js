import Like from '../models/Like.model.js';
import Video from '../models/Video.model.js';
import Comment from '../models/Comment.model.js';
import Playlist from '../models/Playlist.model.js';
import { asyncHandler, sendSuccess, getPagination, buildPaginationMeta } from '../utils/apiHelpers.js';
import { createNotification } from '../utils/notificationHelper.js';

const normalizeEntityType = (type) => {
  if (!type) return null;
  const lower = String(type).toLowerCase();
  if (lower === 'video') return 'Video';
  if (lower === 'comment') return 'Comment';
  return null;
};

// POST /api/v1/likes/:entityType/:entityId
export const toggleLike = asyncHandler(async (req, res) => {
  const { entityType: rawType, entityId } = req.params;
  const { type } = req.body; // 'like' | 'dislike'

  const entityType = normalizeEntityType(rawType);
  if (!entityType) {
    return res.status(400).json({ success: false, message: 'Invalid entityType. Must be "video" or "comment".' });
  }

  if (type !== 'like' && type !== 'dislike') {
    return res.status(400).json({ success: false, message: 'Reaction type must be either "like" or "dislike".' });
  }

  // Find target entity
  let target;
  let targetOwnerId;

  if (entityType === 'Video') {
    target = await Video.findById(entityId);
    if (!target) return res.status(404).json({ success: false, message: 'Video not found.' });
    targetOwnerId = target.owner;
  } else {
    target = await Comment.findById(entityId);
    if (!target) return res.status(404).json({ success: false, message: 'Comment not found.' });
    targetOwnerId = target.author;
  }

  const existing = await Like.findOne({
    user: req.user._id,
    entityType,
    entityId,
  });

  let userLiked = false;
  let userDisliked = false;
  let responseMessage = '';

  // Case 1: Clicking the same reaction again removes it (toggle off)
  if (existing && existing.type === type) {
    await existing.deleteOne();

    const decField = type === 'like' ? { likeCount: -1 } : { dislikeCount: -1 };
    if (entityType === 'Video') {
      target = await Video.findByIdAndUpdate(entityId, { $inc: decField }, { new: true });
      // Remove from Liked Videos playlist if unliking
      if (type === 'like') {
        await Playlist.updateOne(
          { owner: req.user._id, isSystem: true, systemType: 'liked_videos' },
          { $pull: { videos: { video: entityId } } }
        );
      }
    } else {
      target = await Comment.findByIdAndUpdate(entityId, { $inc: decField }, { new: true });
    }

    responseMessage = `${type === 'like' ? 'Like' : 'Dislike'} removed`;
  }
  // Case 2: Switching reactions (e.g. was dislike, now like)
  else if (existing) {
    const oldType = existing.type;
    existing.type = type;
    await existing.save();

    const incUpdate = type === 'like'
      ? { likeCount: 1, dislikeCount: -1 }
      : { likeCount: -1, dislikeCount: 1 };

    if (entityType === 'Video') {
      target = await Video.findByIdAndUpdate(entityId, { $inc: incUpdate }, { new: true });
      if (type === 'like') {
        await Playlist.updateOne(
          { owner: req.user._id, isSystem: true, systemType: 'liked_videos' },
          { $addToSet: { videos: { video: entityId, addedAt: new Date(), position: 0 } } }
        );
      } else {
        await Playlist.updateOne(
          { owner: req.user._id, isSystem: true, systemType: 'liked_videos' },
          { $pull: { videos: { video: entityId } } }
        );
      }
    } else {
      target = await Comment.findByIdAndUpdate(entityId, { $inc: incUpdate }, { new: true });
    }

    userLiked = type === 'like';
    userDisliked = type === 'dislike';
    responseMessage = `Changed to ${type}`;

    if (type === 'like') {
      await createNotification({
        recipient: targetOwnerId,
        sender: req.user._id,
        type: 'like',
        entityType,
        entityId,
        message: `${req.user.displayName || req.user.username} liked your ${entityType.toLowerCase()}.`,
      });
    }
  }
  // Case 3: New reaction
  else {
    await Like.create({
      user: req.user._id,
      entityType,
      entityId,
      type,
    });

    const incField = type === 'like' ? { likeCount: 1 } : { dislikeCount: 1 };
    if (entityType === 'Video') {
      target = await Video.findByIdAndUpdate(entityId, { $inc: incField }, { new: true });
      if (type === 'like') {
        await Playlist.updateOne(
          { owner: req.user._id, isSystem: true, systemType: 'liked_videos' },
          { $addToSet: { videos: { video: entityId, addedAt: new Date(), position: 0 } } }
        );
      }
    } else {
      target = await Comment.findByIdAndUpdate(entityId, { $inc: incField }, { new: true });
    }

    userLiked = type === 'like';
    userDisliked = type === 'dislike';
    responseMessage = `${type === 'like' ? 'Liked' : 'Disliked'} successfully`;

    if (type === 'like') {
      await createNotification({
        recipient: targetOwnerId,
        sender: req.user._id,
        type: 'like',
        entityType,
        entityId,
        message: `${req.user.displayName || req.user.username} liked your ${entityType.toLowerCase()}.`,
      });
    }
  }

  // Ensure counts never drop below zero
  const safeLikeCount = Math.max(0, target.likeCount || 0);
  const safeDislikeCount = Math.max(0, target.dislikeCount || 0);

  return sendSuccess(res, {
    liked: userLiked,
    disliked: userDisliked,
    likeCount: safeLikeCount,
    dislikeCount: safeDislikeCount,
  }, responseMessage);
});

// GET /api/v1/likes/:entityType/:entityId
export const getLikeStatus = asyncHandler(async (req, res) => {
  const { entityType: rawType, entityId } = req.params;

  const entityType = normalizeEntityType(rawType);
  if (!entityType) {
    return res.status(400).json({ success: false, message: 'Invalid entityType. Must be "video" or "comment".' });
  }

  let target;
  if (entityType === 'Video') {
    target = await Video.findById(entityId, 'likeCount dislikeCount');
    if (!target) return res.status(404).json({ success: false, message: 'Video not found.' });
  } else {
    target = await Comment.findById(entityId, 'likeCount dislikeCount');
    if (!target) return res.status(404).json({ success: false, message: 'Comment not found.' });
  }

  let liked = false;
  let disliked = false;

  if (req.user) {
    const existing = await Like.findOne({
      user: req.user._id,
      entityType,
      entityId,
    });
    if (existing) {
      liked = existing.type === 'like';
      disliked = existing.type === 'dislike';
    }
  }

  return sendSuccess(res, {
    liked,
    disliked,
    likeCount: Math.max(0, target.likeCount || 0),
    dislikeCount: Math.max(0, target.dislikeCount || 0),
  });
});

// GET /api/v1/likes/videos (videos liked by authenticated user)
export const getLikedVideos = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const [likes, total] = await Promise.all([
    Like.find({
      user: req.user._id,
      entityType: 'Video',
      type: 'like',
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'entityId',
        select: 'title description thumbnail videoFile views likeCount commentCount createdAt owner visibility isPublished status',
        populate: { path: 'owner', select: 'username displayName avatar subscriberCount' },
      }),
    Like.countDocuments({
      user: req.user._id,
      entityType: 'Video',
      type: 'like',
    }),
  ]);

  // Filter out any videos that were deleted from the database
  const validLikes = likes.filter((l) => l.entityId != null);
  const videos = validLikes.map((l) => {
    const vidObj = l.entityId.toObject ? l.entityId.toObject() : l.entityId;
    return {
      ...vidObj,
      likedAt: l.createdAt,
      likeId: l._id,
    };
  });

  return sendSuccess(res, {
    videos,
    pagination: buildPaginationMeta(total, page, limit),
  });
});
