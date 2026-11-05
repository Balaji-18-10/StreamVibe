import validator from 'validator';
import User from '../models/User.model.js';
import Video from '../models/Video.model.js';
import Playlist from '../models/Playlist.model.js';
import Subscription from '../models/Subscription.model.js';
import Notification from '../models/Notification.model.js';
import { asyncHandler, sendSuccess, getPagination, buildPaginationMeta } from '../utils/apiHelpers.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// GET /api/v1/users/:username
export const getChannel = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username.replace('@', '') });
  if (!user) return res.status(404).json({ success: false, message: 'Channel not found.' });
  return sendSuccess(res, { channel: user.toPublicProfile() });
});

// PATCH /api/v1/users/me/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { displayName, username, email, bio, links } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  if (displayName !== undefined) {
    const trimmed = displayName.trim();
    if (!trimmed) {
      return res.status(400).json({ success: false, message: 'Display name cannot be empty.' });
    }
    if (trimmed.length > 50) {
      return res.status(400).json({ success: false, message: 'Display name cannot exceed 50 characters.' });
    }
    user.displayName = trimmed;
  }

  if (username !== undefined && username.trim().toLowerCase() !== user.username) {
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ success: false, message: 'Username must be between 3 and 30 characters.' });
    }
    if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, underscores, dots and hyphens.',
      });
    }
    const existing = await User.findOne({ username: cleanUsername, _id: { $ne: user._id } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }
    user.username = cleanUsername;
  }

  if (email !== undefined && email.trim().toLowerCase() !== user.email) {
    const cleanEmail = email.trim().toLowerCase();
    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    const existing = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email address is already in use.' });
    }
    user.email = cleanEmail;
  }

  if (bio !== undefined) {
    if (bio.length > 1000) {
      return res.status(400).json({ success: false, message: 'Bio cannot exceed 1000 characters.' });
    }
    user.bio = bio;
  }

  if (links !== undefined && typeof links === 'object') {
    user.links = {
      website: links.website !== undefined ? links.website.trim() : (user.links?.website || ''),
      twitter: links.twitter !== undefined ? links.twitter.trim() : (user.links?.twitter || ''),
      instagram: links.instagram !== undefined ? links.instagram.trim() : (user.links?.instagram || ''),
    };
  }

  await user.save({ validateBeforeSave: false });
  return sendSuccess(res, { user: user.toPublicProfile() }, 'Profile updated');
});

// DELETE /api/v1/users/me
export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body || {};
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  if (password && !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Incorrect password. Account deletion aborted.' });
  }

  // Delete user's playlists
  await Playlist.deleteMany({ owner: user._id });
  // Clean up subscriptions
  await Subscription.deleteMany({ $or: [{ subscriber: user._id }, { channel: user._id }] });
  // Clean up notifications
  await Notification.deleteMany({ $or: [{ recipient: user._id }, { sender: user._id }] });

  if (user.avatar?.publicId) {
    try { await deleteFromCloudinary(user.avatar.publicId); } catch {}
  }
  if (user.banner?.publicId) {
    try { await deleteFromCloudinary(user.banner.publicId); } catch {}
  }

  await user.deleteOne();
  res.clearCookie('refreshToken');
  return sendSuccess(res, {}, 'Account permanently deleted');
});

// PATCH /api/v1/users/me/avatar
export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image provided.' });

  const user = await User.findById(req.user._id);
  // Delete old avatar
  if (user.avatar?.publicId) await deleteFromCloudinary(user.avatar.publicId);

  const result = await uploadToCloudinary(req.file.buffer, 'streamvibe/avatars', {
    width: 400, height: 400, crop: 'fill', gravity: 'face',
  });

  user.avatar = { url: result.secure_url, publicId: result.public_id };
  await user.save({ validateBeforeSave: false });
  return sendSuccess(res, { avatar: user.avatar }, 'Avatar updated');
});

// PATCH /api/v1/users/me/banner
export const updateBanner = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image provided.' });

  const user = await User.findById(req.user._id);
  if (user.banner?.publicId) await deleteFromCloudinary(user.banner.publicId);

  const result = await uploadToCloudinary(req.file.buffer, 'streamvibe/banners', {
    width: 2560, height: 424, crop: 'fill',
  });

  user.banner = { url: result.secure_url, publicId: result.public_id };
  await user.save({ validateBeforeSave: false });
  return sendSuccess(res, { banner: user.banner }, 'Banner updated');
});

// GET /api/v1/users/me/history
export const getWatchHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const rawUser = await User.findById(req.user._id, 'watchHistory');
  if (!rawUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const total = rawUser.watchHistory?.length || 0;

  const user = await User.findById(req.user._id).populate({
    path: 'watchHistory',
    select: 'title description thumbnail videoFile.duration views createdAt owner',
    populate: { path: 'owner', select: 'username displayName avatar' },
    options: { skip, limit },
  });

  const validVideos = (user.watchHistory || []).filter(Boolean);

  return sendSuccess(res, {
    videos: validVideos,
    pagination: buildPaginationMeta(total, page, limit),
  });
});

// DELETE /api/v1/users/me/history/:videoId
export const removeFromWatchHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { watchHistory: videoId },
  });
  return sendSuccess(res, {}, 'Video removed from watch history');
});

// DELETE /api/v1/users/me/history
export const clearWatchHistory = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { watchHistory: [] });
  return sendSuccess(res, {}, 'Watch history cleared');
});

// GET /api/v1/users/:username/playlists
export const getUserPlaylists = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username.replace('@', '') }, '_id');
  if (!user) return res.status(404).json({ success: false, message: 'Channel not found.' });

  const playlists = await Playlist.find({
    owner: user._id,
    visibility: 'public',
    isSystem: false,
  }).sort({ createdAt: -1 });

  return sendSuccess(res, { playlists });
});
