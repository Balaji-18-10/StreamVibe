import Video from '../models/Video.model.js';
import User from '../models/User.model.js';
import { asyncHandler, sendSuccess, getPagination, buildPaginationMeta } from '../utils/apiHelpers.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

/**
 * Safely parse and validate video tags.
 * Accepts an array of strings, a JSON-formatted string, or a comma-separated string.
 * Returns { tags: string[] } on success, or { error: string } on invalid input.
 */
const parseTags = (tagsInput) => {
  if (tagsInput === undefined || tagsInput === null || tagsInput === '') {
    return { tags: [] };
  }

  if (Array.isArray(tagsInput)) {
    return { tags: tagsInput.map((t) => String(t).trim()).filter(Boolean) };
  }

  if (typeof tagsInput === 'string') {
    const trimmed = tagsInput.trim();
    if (!trimmed) return { tags: [] };

    // Check if client sent JSON array string e.g. '["tech", "react"]'
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          return { error: 'Tags JSON must represent an array of strings.' };
        }
        return { tags: parsed.map((t) => String(t).trim()).filter(Boolean) };
      } catch {
        return { error: 'Invalid JSON format for tags.' };
      }
    }

    // Otherwise treat as comma-separated list e.g. 'tech, react, tutorial'
    return { tags: trimmed.split(',').map((t) => t.trim()).filter(Boolean) };
  }

  return { error: 'Tags must be an array or comma-separated string.' };
};

// POST /api/v1/videos/upload
export const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description, category, tags, type, visibility } = req.body;
  if (!req.files?.video?.[0]) return res.status(400).json({ success: false, message: 'Video file is required.' });

  // Validate tags if provided
  let formattedTags = [];
  if (tags !== undefined) {
    const tagResult = parseTags(tags);
    if (tagResult.error) {
      return res.status(400).json({ success: false, message: tagResult.error });
    }
    formattedTags = tagResult.tags;
  }

  // Upload video to Cloudinary
  const videoResult = await uploadToCloudinary(req.files.video[0].buffer, 'streamvibe/videos', {
    resource_type: 'video',
  });

  let thumbnailResult = null;
  if (req.files?.thumbnail?.[0]) {
    thumbnailResult = await uploadToCloudinary(req.files.thumbnail[0].buffer, 'streamvibe/thumbnails');
  }

  const video = await Video.create({
    title,
    description,
    videoFile: {
      url: videoResult.secure_url,
      publicId: videoResult.public_id,
      duration: videoResult.duration || 0,
      format: videoResult.format,
    },
    thumbnail: thumbnailResult ? { url: thumbnailResult.secure_url, publicId: thumbnailResult.public_id } : {},
    owner: req.user._id,
    category: category || 'Other',
    tags: formattedTags,
    type: type || 'video',
    visibility: visibility || 'public',
    isPublished: true,
    status: 'ready',
  });

  // Update user video count
  await User.findByIdAndUpdate(req.user._id, { $inc: { videoCount: 1 } });

  return sendSuccess(res, { video }, 'Video uploaded successfully', 201);
});

// GET /api/v1/videos
export const getAllVideos = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { category, sort = 'newest' } = req.query;

  const query = { visibility: 'public', isPublished: true, status: 'ready', type: 'video' };
  if (category) query.category = category;

  const sortMap = { newest: { createdAt: -1 }, popular: { views: -1 }, trending: { likeCount: -1 } };
  const sortOption = sortMap[sort] || { createdAt: -1 };

  const [videos, total] = await Promise.all([
    Video.find(query).sort(sortOption).skip(skip).limit(limit)
      .populate('owner', 'username displayName avatar'),
    Video.countDocuments(query),
  ]);

  return sendSuccess(res, { videos, pagination: buildPaginationMeta(total, page, limit) });
});

// GET /api/v1/videos/trending
export const getTrendingVideos = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

  const videos = await Video.find({
    visibility: 'public', isPublished: true, status: 'ready',
    createdAt: { $gte: since },
  })
    .sort({ views: -1, likeCount: -1 })
    .limit(parseInt(limit))
    .populate('owner', 'username displayName avatar');

  return sendSuccess(res, { videos });
});

// GET /api/v1/videos/shorts
export const getShorts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const [videos, total] = await Promise.all([
    Video.find({ type: 'short', visibility: 'public', isPublished: true, status: 'ready' })
      .sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('owner', 'username displayName avatar'),
    Video.countDocuments({ type: 'short', visibility: 'public', isPublished: true }),
  ]);
  return sendSuccess(res, { videos, pagination: buildPaginationMeta(total, page, limit) });
});

// GET /api/v1/videos/:id
export const getVideoById = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id)
    .populate('owner', 'username displayName avatar subscriberCount');
  if (!video || video.status !== 'ready') {
    return res.status(404).json({ success: false, message: 'Video not found.' });
  }
  return sendSuccess(res, { video });
});

// POST /api/v1/videos/:id/view
export const incrementView = asyncHandler(async (req, res) => {
  const video = await Video.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!video) {
    return res.status(404).json({ success: false, message: 'Video not found.' });
  }

  if (video.owner) {
    await User.findByIdAndUpdate(video.owner, { $inc: { totalViews: 1 } });
  }

  // Update authenticated user watch history (most recent first, no duplicates)
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { watchHistory: video._id },
    });
    await User.findByIdAndUpdate(req.user._id, {
      $push: { watchHistory: { $each: [video._id], $position: 0 } },
    });
  }

  return sendSuccess(res, {}, 'View recorded');
});

// GET /api/v1/videos/:id/recommended
export const getRecommendedVideos = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id, 'category tags owner');
  const videos = await Video.find({
    _id: { $ne: req.params.id },
    visibility: 'public', isPublished: true, status: 'ready',
    $or: [{ category: video?.category }, { tags: { $in: video?.tags || [] } }],
  })
    .limit(20)
    .populate('owner', 'username displayName avatar');
  return sendSuccess(res, { videos });
});

// GET /api/v1/videos/channel/:username
export const getChannelVideos = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { type, sort = 'newest' } = req.query;
  const user = await User.findOne({ username: req.params.username.replace('@', '') }, '_id');
  if (!user) return res.status(404).json({ success: false, message: 'Channel not found.' });

  const query = { owner: user._id, visibility: 'public', isPublished: true, status: 'ready' };
  if (type) query.type = type;

  const sortMap = {
    newest: { createdAt: -1 },
    popular: { views: -1 },
    oldest: { createdAt: 1 },
  };
  const sortOption = sortMap[sort] || { createdAt: -1 };

  const [videos, total] = await Promise.all([
    Video.find(query).sort(sortOption).skip(skip).limit(limit),
    Video.countDocuments(query),
  ]);
  return sendSuccess(res, { videos, pagination: buildPaginationMeta(total, page, limit) });
});

// GET /api/v1/videos/studio/my-videos
export const getMyVideos = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { search, visibility, type, sort = 'newest' } = req.query;

  const query = { owner: req.user._id };
  if (visibility && visibility !== 'all') query.visibility = visibility;
  if (type && type !== 'all') query.type = type;
  if (search && search.trim()) {
    query.title = { $regex: search.trim(), $options: 'i' };
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    popular: { views: -1 },
    likes: { likeCount: -1 },
  };
  const sortOption = sortMap[sort] || { createdAt: -1 };

  const [videos, total] = await Promise.all([
    Video.find(query).sort(sortOption).skip(skip).limit(limit),
    Video.countDocuments(query),
  ]);

  return sendSuccess(res, { videos, pagination: buildPaginationMeta(total, page, limit) });
});

// PATCH /api/v1/videos/:id
export const updateVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });
  if (video.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized.' });
  }

  const { title, description, category, tags, visibility } = req.body;
  if (title) video.title = title;
  if (description !== undefined) video.description = description;
  if (category) video.category = category;
  if (tags !== undefined) {
    const tagResult = parseTags(tags);
    if (tagResult.error) {
      return res.status(400).json({ success: false, message: tagResult.error });
    }
    video.tags = tagResult.tags;
  }
  if (visibility) video.visibility = visibility;

  if (req.file) {
    if (video.thumbnail?.publicId) await deleteFromCloudinary(video.thumbnail.publicId);
    const result = await uploadToCloudinary(req.file.buffer, 'streamvibe/thumbnails');
    video.thumbnail = { url: result.secure_url, publicId: result.public_id };
  }

  await video.save();
  return sendSuccess(res, { video }, 'Video updated');
});

// DELETE /api/v1/videos/:id
export const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });
  if (video.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized.' });
  }

  await Promise.all([
    deleteFromCloudinary(video.videoFile.publicId, 'video'),
    video.thumbnail?.publicId ? deleteFromCloudinary(video.thumbnail.publicId) : null,
  ]);

  await video.deleteOne();
  await User.findByIdAndUpdate(req.user._id, { $inc: { videoCount: -1 } });
  return sendSuccess(res, {}, 'Video deleted');
});
