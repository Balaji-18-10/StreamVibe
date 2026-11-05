import Video from '../models/Video.model.js';
import User from '../models/User.model.js';
import { asyncHandler, sendSuccess } from '../utils/apiHelpers.js';

// GET /api/v1/analytics/channel
export const getChannelAnalytics = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id, 'subscriberCount videoCount totalViews');

  const [aggregatedStats, recentVideos, topVideos] = await Promise.all([
    Video.aggregate([
      { $match: { owner: req.user._id } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likeCount' },
          totalComments: { $sum: '$commentCount' },
          videoCount: { $sum: 1 },
        },
      },
    ]),
    Video.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title views likeCount commentCount createdAt thumbnail videoFile.duration visibility status type'),
    Video.find({ owner: req.user._id, isPublished: true })
      .sort({ views: -1 })
      .limit(5)
      .select('title views likeCount commentCount createdAt thumbnail videoFile.duration visibility status type'),
  ]);

  const stats = aggregatedStats[0] || {
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    videoCount: 0,
  };

  const latestVideo = recentVideos[0] || null;

  return sendSuccess(res, {
    overview: {
      subscribers: user?.subscriberCount || 0,
      totalSubscribers: user?.subscriberCount || 0,
      totalVideos: Math.max(user?.videoCount || 0, stats.videoCount),
      totalViews: Math.max(user?.totalViews || 0, stats.totalViews),
      totalLikes: stats.totalLikes,
      totalComments: stats.totalComments,
    },
    latestVideoPerformance: latestVideo
      ? {
          _id: latestVideo._id,
          title: latestVideo.title,
          thumbnail: latestVideo.thumbnail?.url || latestVideo.thumbnail,
          views: latestVideo.views,
          likeCount: latestVideo.likeCount,
          commentCount: latestVideo.commentCount,
          createdAt: latestVideo.createdAt,
          duration: latestVideo.videoFile?.duration || 0,
        }
      : null,
    recentVideos,
    topVideos,
  });
});

// GET /api/v1/analytics/video/:videoId
export const getVideoAnalytics = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.videoId, owner: req.user._id });
  if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });
  return sendSuccess(res, { video: { views: video.views, likeCount: video.likeCount, commentCount: video.commentCount } });
});

// GET /api/v1/analytics/audience
export const getAudienceAnalytics = asyncHandler(async (req, res) => {
  // Placeholder — will be expanded with actual aggregations
  return sendSuccess(res, { audience: {} });
});
