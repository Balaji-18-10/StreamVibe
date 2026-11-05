import mongoose from 'mongoose';
import Report from '../models/Report.model.js';
import Video from '../models/Video.model.js';
import Comment from '../models/Comment.model.js';
import User from '../models/User.model.js';
import Like from '../models/Like.model.js';
import { asyncHandler, sendSuccess, getPagination, buildPaginationMeta } from '../utils/apiHelpers.js';

const VALID_REASONS = ['spam', 'misleading', 'violence', 'harassment', 'copyright', 'other'];
const VALID_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'];
const VALID_ACTIONS = ['none', 'content_removed', 'user_warned', 'dismissed'];

// POST /api/v1/reports
export const createReport = asyncHandler(async (req, res) => {
  const { entityType, entityId, reason, description } = req.body;

  if (!entityType || !['Video', 'Comment'].includes(entityType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid entityType. Must be either "Video" or "Comment".',
    });
  }

  if (!entityId || !mongoose.Types.ObjectId.isValid(entityId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid entityId is required.',
    });
  }

  if (!reason || !VALID_REASONS.includes(reason)) {
    return res.status(400).json({
      success: false,
      message: `Invalid reason. Allowed reasons: ${VALID_REASONS.join(', ')}`,
    });
  }

  if (description && description.length > 1000) {
    return res.status(400).json({
      success: false,
      message: 'Description cannot exceed 1000 characters.',
    });
  }

  // Verify entity existence
  if (entityType === 'Video') {
    const video = await Video.findById(entityId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Reported video not found.' });
    }
  } else if (entityType === 'Comment') {
    const comment = await Comment.findById(entityId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Reported comment not found.' });
    }
  }

  // Prevent duplicate active reports from the same user for the same content
  const existingActiveReport = await Report.findOne({
    reporter: req.user._id,
    entityType,
    entityId,
    status: { $in: ['pending', 'reviewed'] },
  });

  if (existingActiveReport) {
    return res.status(400).json({
      success: false,
      message: 'You have already submitted a report for this content that is currently under review.',
    });
  }

  const report = await Report.create({
    reporter: req.user._id,
    entityType,
    entityId,
    reason,
    description: description ? description.trim() : '',
  });

  const populated = await Report.findById(report._id).populate('reporter', 'username displayName avatar');

  return sendSuccess(
    res,
    { report: populated },
    'Thank you for reporting this content. Our moderation team will review it shortly.',
    201
  );
});

// GET /api/v1/reports/my
export const getMyReports = asyncHandler(async (req, res) => {
  const reports = await Report.find({ reporter: req.user._id })
    .populate('entityId')
    .sort({ createdAt: -1 });

  return sendSuccess(res, { reports });
});

// ─── ADMIN ENDPOINTS ──────────────────────────────────────────

// GET /api/v1/admin/stats
export const getAdminStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalVideos,
    totalReports,
    pendingReports,
    resolvedReports,
    dismissedReports,
    recentUsers,
    recentVideos,
  ] = await Promise.all([
    User.countDocuments(),
    Video.countDocuments(),
    Report.countDocuments(),
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'resolved' }),
    Report.countDocuments({ status: 'dismissed' }),
    User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username displayName avatar email role createdAt'),
    Video.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('owner', 'username displayName avatar')
      .select('title thumbnail views createdAt isPublished category type'),
  ]);

  return sendSuccess(res, {
    stats: {
      totalUsers,
      totalVideos,
      totalReports,
      pendingReports,
      resolvedReports,
      dismissedReports,
      recentUsers,
      recentVideos,
    },
  });
});

// GET /api/v1/admin/reports
export const getReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 10);
  const { status, reason, entityType, search } = req.query;

  const filter = {};

  if (status && VALID_STATUSES.includes(status)) {
    filter.status = status;
  }

  if (reason && VALID_REASONS.includes(reason)) {
    filter.reason = reason;
  }

  if (entityType && ['Video', 'Comment'].includes(entityType)) {
    filter.entityType = entityType;
  }

  if (search && search.trim()) {
    filter.$or = [
      { description: { $regex: search.trim(), $options: 'i' } },
      { reason: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const [total, reports] = await Promise.all([
    Report.countDocuments(filter),
    Report.find(filter)
      .populate('reporter', 'username displayName avatar email')
      .populate('reviewedBy', 'username displayName avatar')
      .populate('entityId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  return sendSuccess(res, {
    reports,
    pagination: buildPaginationMeta(total, page, limit),
  });
});

// GET /api/v1/admin/reports/:reportId
export const getReportById = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    return res.status(400).json({ success: false, message: 'Invalid report ID.' });
  }

  const report = await Report.findById(reportId)
    .populate('reporter', 'username displayName avatar email')
    .populate('reviewedBy', 'username displayName avatar email')
    .populate('entityId');

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found.' });
  }

  return sendSuccess(res, { report });
});

// PATCH /api/v1/admin/reports/:reportId
export const updateReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status, moderationAction, moderatorNotes } = req.body;

  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    return res.status(400).json({ success: false, message: 'Invalid report ID.' });
  }

  const report = await Report.findById(reportId);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found.' });
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed statuses: ${VALID_STATUSES.join(', ')}`,
      });
    }
    report.status = status;
  }

  if (moderationAction !== undefined) {
    if (!VALID_ACTIONS.includes(moderationAction)) {
      return res.status(400).json({
        success: false,
        message: `Invalid moderation action. Allowed actions: ${VALID_ACTIONS.join(', ')}`,
      });
    }
    report.moderationAction = moderationAction;
  }

  if (moderatorNotes !== undefined) {
    report.moderatorNotes = moderatorNotes.trim();
  }

  report.reviewedBy = req.user._id;
  report.reviewedAt = new Date();

  await report.save();

  const updated = await Report.findById(report._id)
    .populate('reporter', 'username displayName avatar email')
    .populate('reviewedBy', 'username displayName avatar email')
    .populate('entityId');

  return sendSuccess(res, { report: updated }, 'Report updated successfully.');
});

// POST /api/v1/admin/reports/:reportId/takedown
export const takedownReportedContent = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { moderatorNotes } = req.body;

  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    return res.status(400).json({ success: false, message: 'Invalid report ID.' });
  }

  const report = await Report.findById(reportId);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found.' });
  }

  // Perform takedown based on entityType
  if (report.entityType === 'Video') {
    const video = await Video.findById(report.entityId);
    if (video) {
      video.isPublished = false;
      await video.save();
    }
  } else if (report.entityType === 'Comment') {
    const comment = await Comment.findById(report.entityId);
    if (comment) {
      if (comment.parentComment) {
        // Child reply
        await Comment.findByIdAndUpdate(comment.parentComment, { $inc: { replyCount: -1 } });
        await Video.findByIdAndUpdate(comment.video, { $inc: { commentCount: -1 } });
        await Like.deleteMany({ entityType: 'Comment', entityId: comment._id });
        await comment.deleteOne();
      } else {
        // Top-level comment: cascade delete replies
        const replies = await Comment.find({ parentComment: comment._id }, '_id');
        const replyIds = replies.map((r) => r._id);
        const totalDeleted = 1 + replyIds.length;

        await Comment.deleteMany({ parentComment: comment._id });
        await Video.findByIdAndUpdate(comment.video, { $inc: { commentCount: -totalDeleted } });
        await Like.deleteMany({ entityType: 'Comment', entityId: { $in: [comment._id, ...replyIds] } });
        await comment.deleteOne();
      }
    }
  }

  // Resolve this report and any active reports for the same entity
  const notes = moderatorNotes?.trim() || 'Content removed by administrator.';

  report.status = 'resolved';
  report.moderationAction = 'content_removed';
  report.moderatorNotes = notes;
  report.reviewedBy = req.user._id;
  report.reviewedAt = new Date();
  await report.save();

  // Also auto-resolve all other pending/reviewed reports on the same entity
  await Report.updateMany(
    {
      entityType: report.entityType,
      entityId: report.entityId,
      _id: { $ne: report._id },
      status: { $in: ['pending', 'reviewed'] },
    },
    {
      status: 'resolved',
      moderationAction: 'content_removed',
      moderatorNotes: 'Resolved as duplicate: content was removed.',
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    }
  );

  const updated = await Report.findById(report._id)
    .populate('reporter', 'username displayName avatar email')
    .populate('reviewedBy', 'username displayName avatar email');

  return sendSuccess(
    res,
    { report: updated },
    'Violating content was taken down and associated reports were resolved.'
  );
});
