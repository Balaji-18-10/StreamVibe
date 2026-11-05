import Comment from '../models/Comment.model.js';
import Video from '../models/Video.model.js';
import Like from '../models/Like.model.js';
import { asyncHandler, sendSuccess, getPagination, buildPaginationMeta } from '../utils/apiHelpers.js';
import { createNotification } from '../utils/notificationHelper.js';

// GET /api/v1/comments/video/:videoId
export const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page, limit, skip } = getPagination(req.query);
  const { sort = 'top' } = req.query;

  const video = await Video.findById(videoId, '_id');
  if (!video) {
    return res.status(404).json({ success: false, message: 'Video not found.' });
  }

  // Only fetch top-level comments (parentComment: null)
  const query = { video: videoId, parentComment: null };
  const sortOption = sort === 'newest'
    ? { isPinned: -1, createdAt: -1 }
    : { isPinned: -1, likeCount: -1, createdAt: -1 };

  const [comments, total] = await Promise.all([
    Comment.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatar'),
    Comment.countDocuments(query),
  ]);

  return sendSuccess(res, {
    comments,
    pagination: buildPaginationMeta(total, page, limit),
  });
});

// GET /api/v1/comments/:commentId/replies
export const getReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { page, limit, skip } = getPagination(req.query);

  const parent = await Comment.findById(commentId, '_id');
  if (!parent) {
    return res.status(404).json({ success: false, message: 'Comment not found.' });
  }

  const query = { parentComment: commentId };
  const [replies, total] = await Promise.all([
    Comment.find(query)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatar'),
    Comment.countDocuments(query),
  ]);

  return sendSuccess(res, {
    replies,
    pagination: buildPaginationMeta(total, page, limit),
  });
});

// POST /api/v1/comments/video/:videoId
export const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content, parentComment: parentCommentId } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
  }

  if (content.trim().length > 2000) {
    return res.status(400).json({ success: false, message: 'Comment cannot exceed 2000 characters.' });
  }

  const video = await Video.findById(videoId);
  if (!video) {
    return res.status(404).json({ success: false, message: 'Video not found.' });
  }

  let finalParentId = null;
  let parentComment = null;

  if (parentCommentId) {
    parentComment = await Comment.findById(parentCommentId);
    if (!parentComment) {
      return res.status(404).json({ success: false, message: 'Parent comment not found.' });
    }
    if (parentComment.video.toString() !== videoId.toString()) {
      return res.status(400).json({ success: false, message: 'Parent comment belongs to a different video.' });
    }

    // Keep replies one level deep: if replying to a reply, attach to the top-level parent
    finalParentId = parentComment.parentComment ? parentComment.parentComment : parentComment._id;
  }

  const comment = await Comment.create({
    content: content.trim(),
    author: req.user._id,
    video: videoId,
    parentComment: finalParentId,
  });

  // Increment video total comment count
  await Video.findByIdAndUpdate(videoId, { $inc: { commentCount: 1 } });

  // If this was a reply, increment parent's replyCount
  if (finalParentId) {
    await Comment.findByIdAndUpdate(finalParentId, { $inc: { replyCount: 1 } });
  }

  // Populate author details for immediate client display
  const populatedComment = await Comment.findById(comment._id)
    .populate('author', 'username displayName avatar');

  // Trigger notification
  if (finalParentId && parentComment) {
    // Notify the parent comment author
    await createNotification({
      recipient: parentComment.author,
      sender: req.user._id,
      type: 'comment_reply',
      entityType: 'Comment',
      entityId: comment._id,
      message: `${req.user.displayName || req.user.username} replied to your comment.`,
    });
  } else {
    // Notify the video owner
    await createNotification({
      recipient: video.owner,
      sender: req.user._id,
      type: 'new_comment',
      entityType: 'Comment',
      entityId: comment._id,
      message: `${req.user.displayName || req.user.username} commented on your video.`,
    });
  }

  return sendSuccess(res, { comment: populatedComment }, 'Comment added successfully', 201);
});

// PATCH /api/v1/comments/:commentId
export const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
  }

  if (content.trim().length > 2000) {
    return res.status(400).json({ success: false, message: 'Comment cannot exceed 2000 characters.' });
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found.' });
  }

  if (comment.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this comment.' });
  }

  comment.content = content.trim();
  comment.isEdited = true;
  await comment.save();

  const populated = await Comment.findById(comment._id)
    .populate('author', 'username displayName avatar');

  return sendSuccess(res, { comment: populated }, 'Comment updated successfully');
});

// DELETE /api/v1/comments/:commentId
export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found.' });
  }

  const video = await Video.findById(comment.video, 'owner');
  const isAuthor = comment.author.toString() === req.user._id.toString();
  const isVideoOwner = video && video.owner.toString() === req.user._id.toString();
  const isAdmin = req.user?.role === 'admin';

  // Either comment author, video creator or admin can delete comments
  if (!isAuthor && !isVideoOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this comment.' });
  }

  if (comment.parentComment) {
    // Deleted a reply
    await Comment.findByIdAndUpdate(comment.parentComment, { $inc: { replyCount: -1 } });
    await Video.findByIdAndUpdate(comment.video, { $inc: { commentCount: -1 } });
    await Like.deleteMany({ entityType: 'Comment', entityId: comment._id });
    await comment.deleteOne();
  } else {
    // Deleted a top-level comment: also remove child replies
    const replies = await Comment.find({ parentComment: comment._id }, '_id');
    const replyIds = replies.map((r) => r._id);
    const totalDeleted = 1 + replyIds.length;

    await Comment.deleteMany({ parentComment: comment._id });
    await Video.findByIdAndUpdate(comment.video, { $inc: { commentCount: -totalDeleted } });
    await Like.deleteMany({ entityType: 'Comment', entityId: { $in: [comment._id, ...replyIds] } });
    await comment.deleteOne();
  }

  return sendSuccess(res, {}, 'Comment deleted successfully');
});

// PATCH /api/v1/comments/:commentId/pin
export const pinComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found.' });
  }

  if (comment.parentComment) {
    return res.status(400).json({ success: false, message: 'Only top-level comments can be pinned.' });
  }

  const video = await Video.findById(comment.video, 'owner');
  if (!video || video.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Only the video creator can pin comments.' });
  }

  if (comment.isPinned) {
    // Unpin
    comment.isPinned = false;
    await comment.save();
    return sendSuccess(res, { comment, isPinned: false }, 'Comment unpinned');
  } else {
    // Unpin any existing pinned comment on this video
    await Comment.updateMany({ video: video._id, isPinned: true }, { isPinned: false });
    comment.isPinned = true;
    await comment.save();
    return sendSuccess(res, { comment, isPinned: true }, 'Comment pinned');
  }
});
