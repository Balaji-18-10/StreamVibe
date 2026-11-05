import Video from '../models/Video.model.js';
import User from '../models/User.model.js';
import { asyncHandler, sendSuccess, getPagination, buildPaginationMeta } from '../utils/apiHelpers.js';

// GET /api/v1/search?q=query&type=video|channel&sort=relevance|newest|popular
export const search = asyncHandler(async (req, res) => {
  const { q, type = 'video', sort = 'relevance' } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters.' });
  }

  const sortMap = { relevance: { score: { $meta: 'textScore' } }, newest: { createdAt: -1 }, popular: { views: -1 } };

  if (type === 'channel') {
    const [users, total] = await Promise.all([
      User.find({ $text: { $search: q } }, { score: { $meta: 'textScore' } })
        .sort(sort === 'relevance' ? { score: { $meta: 'textScore' } } : { subscriberCount: -1 })
        .skip(skip).limit(limit)
        .select('username displayName avatar subscriberCount bio'),
      User.countDocuments({ $text: { $search: q } }),
    ]);
    return sendSuccess(res, { results: users, pagination: buildPaginationMeta(total, page, limit) });
  }

  // Default: video search
  const filter = { $text: { $search: q }, visibility: 'public', isPublished: true, status: 'ready' };
  const [videos, total] = await Promise.all([
    Video.find(filter, { score: { $meta: 'textScore' } })
      .sort(sortMap[sort] || sortMap.relevance)
      .skip(skip).limit(limit)
      .populate('owner', 'username displayName avatar'),
    Video.countDocuments(filter),
  ]);

  return sendSuccess(res, { results: videos, pagination: buildPaginationMeta(total, page, limit) });
});

// GET /api/v1/search/suggestions?q=query
export const searchSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return sendSuccess(res, { suggestions: [] });

  const videos = await Video.find(
    { title: { $regex: q, $options: 'i' }, visibility: 'public', isPublished: true },
    'title'
  ).limit(10);

  const suggestions = [...new Set(videos.map((v) => v.title))].slice(0, 8);
  return sendSuccess(res, { suggestions });
});
