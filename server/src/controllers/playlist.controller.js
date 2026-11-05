import Playlist from '../models/Playlist.model.js';
import Video from '../models/Video.model.js';
import User from '../models/User.model.js';
import { asyncHandler, sendSuccess } from '../utils/apiHelpers.js';

// POST /api/v1/playlists
export const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description, visibility, videoId } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Playlist name is required.' });
  }

  if (name.trim().length > 150) {
    return res.status(400).json({ success: false, message: 'Playlist name cannot exceed 150 characters.' });
  }

  const validVisibilities = ['public', 'unlisted', 'private'];
  const finalVisibility = validVisibilities.includes(visibility) ? visibility : 'public';

  const initialVideos = [];
  let thumbnail = '';

  if (videoId) {
    const video = await Video.findById(videoId, 'thumbnail');
    if (!video) {
      return res.status(404).json({ success: false, message: 'Initial video not found.' });
    }
    initialVideos.push({
      video: video._id,
      position: 0,
      addedAt: new Date(),
    });
    thumbnail = video.thumbnail?.url || '';
  }

  const playlist = await Playlist.create({
    name: name.trim(),
    description: description ? description.trim() : '',
    visibility: finalVisibility,
    owner: req.user._id,
    videos: initialVideos,
    thumbnail,
    isSystem: false,
    systemType: null,
  });

  return sendSuccess(res, { playlist }, 'Playlist created successfully', 201);
});

// GET /api/v1/playlists/user/:userId
export const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId, '_id');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const isOwner = req.user && req.user._id.toString() === userId.toString();
  const query = isOwner
    ? { owner: userId } // Owner can see all their playlists, including private & system
    : { owner: userId, visibility: 'public', isSystem: false }; // Others only see custom public playlists

  const playlists = await Playlist.find(query)
    .sort({ createdAt: -1 })
    .populate('videos.video', 'title thumbnail videoFile.duration views');

  return sendSuccess(res, { playlists });
});

// GET /api/v1/playlists/:playlistId
export const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  const playlist = await Playlist.findById(playlistId)
    .populate('owner', 'username displayName avatar')
    .populate({
      path: 'videos.video',
      select: 'title description thumbnail videoFile durationFormatted views createdAt owner',
      populate: { path: 'owner', select: 'username displayName avatar' },
    });

  if (!playlist) {
    return res.status(404).json({ success: false, message: 'Playlist not found.' });
  }

  // Permission check for private playlists
  const isOwner = req.user && playlist.owner._id.toString() === req.user._id.toString();
  if (playlist.visibility === 'private' && !isOwner) {
    return res.status(403).json({ success: false, message: 'This playlist is private.' });
  }

  // Filter out any videos that have been deleted
  if (playlist.videos) {
    playlist.videos = playlist.videos.filter((item) => item.video != null);
  }

  // Derive thumbnail if missing
  if (!playlist.thumbnail && playlist.videos?.[0]?.video?.thumbnail?.url) {
    playlist.thumbnail = playlist.videos[0].video.thumbnail.url;
  }

  return sendSuccess(res, { playlist });
});

// PATCH /api/v1/playlists/:playlistId
export const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description, visibility } = req.body;

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    return res.status(404).json({ success: false, message: 'Playlist not found.' });
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this playlist.' });
  }

  // Cannot rename auto-generated system playlists
  if (playlist.isSystem && name && name.trim() !== playlist.name) {
    return res.status(400).json({ success: false, message: 'Cannot rename system playlists.' });
  }

  if (name && !playlist.isSystem) playlist.name = name.trim();
  if (description !== undefined) playlist.description = description.trim();
  if (visibility && ['public', 'unlisted', 'private'].includes(visibility)) {
    playlist.visibility = visibility;
  }

  await playlist.save();
  return sendSuccess(res, { playlist }, 'Playlist updated successfully');
});

// DELETE /api/v1/playlists/:playlistId
export const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    return res.status(404).json({ success: false, message: 'Playlist not found.' });
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this playlist.' });
  }

  if (playlist.isSystem) {
    return res.status(400).json({ success: false, message: 'System playlists cannot be deleted.' });
  }

  await playlist.deleteOne();
  return sendSuccess(res, {}, 'Playlist deleted successfully');
});

// POST /api/v1/playlists/:playlistId/videos
export const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ success: false, message: 'videoId is required.' });
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    return res.status(404).json({ success: false, message: 'Playlist not found.' });
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to modify this playlist.' });
  }

  const video = await Video.findById(videoId, 'thumbnail');
  if (!video) {
    return res.status(404).json({ success: false, message: 'Video not found.' });
  }

  // Prevent duplicate additions
  const alreadyExists = playlist.videos.some((v) => v.video && v.video.toString() === videoId.toString());
  if (alreadyExists) {
    return res.status(400).json({ success: false, message: 'Video already exists in this playlist.' });
  }

  playlist.videos.push({
    video: video._id,
    position: playlist.videos.length,
    addedAt: new Date(),
  });

  if (!playlist.thumbnail && video.thumbnail?.url) {
    playlist.thumbnail = video.thumbnail.url;
  }

  await playlist.save();
  return sendSuccess(res, { playlist }, 'Video added to playlist');
});

// DELETE /api/v1/playlists/:playlistId/videos/:videoId
export const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    return res.status(404).json({ success: false, message: 'Playlist not found.' });
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to modify this playlist.' });
  }

  const initialCount = playlist.videos.length;
  playlist.videos = playlist.videos.filter((v) => v.video && v.video.toString() !== videoId.toString());

  if (playlist.videos.length === initialCount) {
    return res.status(404).json({ success: false, message: 'Video not found in this playlist.' });
  }

  // Re-index remaining positions
  playlist.videos.forEach((v, idx) => {
    v.position = idx;
  });

  await playlist.save();
  return sendSuccess(res, { playlist }, 'Video removed from playlist');
});

// PATCH /api/v1/playlists/:playlistId/reorder
export const reorderPlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { videoIds } = req.body;

  if (!Array.isArray(videoIds)) {
    return res.status(400).json({ success: false, message: 'videoIds must be an array of video IDs in the new order.' });
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    return res.status(404).json({ success: false, message: 'Playlist not found.' });
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to reorder this playlist.' });
  }

  const videoMap = new Map();
  playlist.videos.forEach((item) => {
    if (item.video) videoMap.set(item.video.toString(), item);
  });

  const reordered = [];
  videoIds.forEach((id, index) => {
    const item = videoMap.get(String(id));
    if (item) {
      item.position = index;
      reordered.push(item);
      videoMap.delete(String(id));
    }
  });

  // Append any videos that were not in the videoIds array
  for (const remaining of videoMap.values()) {
    remaining.position = reordered.length;
    reordered.push(remaining);
  }

  playlist.videos = reordered;
  await playlist.save();

  return sendSuccess(res, { playlist }, 'Playlist reordered successfully');
});

// GET /api/v1/playlists/me (current user's custom playlists)
export const getMyPlaylists = asyncHandler(async (req, res) => {
  const playlists = await Playlist.find({
    owner: req.user._id,
    isSystem: false,
  })
    .sort({ updatedAt: -1 })
    .populate('videos.video', 'title thumbnail videoFile.duration views')
    .populate('owner', 'username displayName avatar');

  return sendSuccess(res, { playlists });
});

// GET /api/v1/playlists/system/watch-later
export const getWatchLaterPlaylist = asyncHandler(async (req, res) => {
  let playlist = await Playlist.findOne({
    owner: req.user._id,
    systemType: 'watch_later',
  })
    .populate('owner', 'username displayName avatar')
    .populate({
      path: 'videos.video',
      select: 'title description thumbnail videoFile durationFormatted views createdAt owner',
      populate: { path: 'owner', select: 'username displayName avatar' },
    });

  if (!playlist) {
    playlist = await Playlist.create({
      name: 'Watch Later',
      owner: req.user._id,
      visibility: 'private',
      isSystem: true,
      systemType: 'watch_later',
      description: 'Videos saved to watch later.',
      videos: [],
    });
    playlist = await playlist.populate('owner', 'username displayName avatar');
  }

  // Filter out deleted videos
  if (playlist.videos) {
    playlist.videos = playlist.videos.filter((v) => v.video != null);
  }

  if (!playlist.thumbnail && playlist.videos?.[0]?.video?.thumbnail?.url) {
    playlist.thumbnail = playlist.videos[0].video.thumbnail.url;
  }

  return sendSuccess(res, { playlist });
});

// POST /api/v1/playlists/system/watch-later/videos
export const addToWatchLater = asyncHandler(async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ success: false, message: 'videoId is required.' });
  }

  const video = await Video.findById(videoId, 'thumbnail');
  if (!video) {
    return res.status(404).json({ success: false, message: 'Video not found.' });
  }

  let playlist = await Playlist.findOne({
    owner: req.user._id,
    systemType: 'watch_later',
  });

  if (!playlist) {
    playlist = await Playlist.create({
      name: 'Watch Later',
      owner: req.user._id,
      visibility: 'private',
      isSystem: true,
      systemType: 'watch_later',
      description: 'Videos saved to watch later.',
      videos: [],
    });
  }

  const exists = playlist.videos.some((v) => v.video && v.video.toString() === videoId.toString());
  if (exists) {
    return res.status(400).json({ success: false, message: 'Video already in Watch Later.' });
  }

  playlist.videos.unshift({
    video: video._id,
    position: 0,
    addedAt: new Date(),
  });

  playlist.videos.forEach((v, idx) => {
    v.position = idx;
  });

  if (!playlist.thumbnail && video.thumbnail?.url) {
    playlist.thumbnail = video.thumbnail.url;
  }

  await playlist.save();
  return sendSuccess(res, { playlist }, 'Added to Watch Later', 201);
});

// DELETE /api/v1/playlists/system/watch-later/videos/:videoId
export const removeFromWatchLater = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const playlist = await Playlist.findOne({
    owner: req.user._id,
    systemType: 'watch_later',
  });

  if (!playlist) {
    return res.status(404).json({ success: false, message: 'Watch Later playlist not found.' });
  }

  const initialCount = playlist.videos.length;
  playlist.videos = playlist.videos.filter((v) => v.video && v.video.toString() !== videoId.toString());

  if (playlist.videos.length === initialCount) {
    return res.status(404).json({ success: false, message: 'Video not found in Watch Later.' });
  }

  playlist.videos.forEach((v, idx) => {
    v.position = idx;
  });

  await playlist.save();
  return sendSuccess(res, { playlist }, 'Removed from Watch Later');
});
