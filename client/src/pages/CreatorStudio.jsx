import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  BarChart3,
  Upload,
  Plus,
  Search,
  Eye,
  ThumbsUp,
  MessageSquare,
  Globe,
  Lock,
  EyeOff,
  Edit,
  Trash2,
  ExternalLink,
  Calendar,
  Sparkles,
  Flame,
  Loader2,
  Filter,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EditVideoModal from '../components/studio/EditVideoModal.jsx';
import DeleteConfirmModal from '../components/studio/DeleteConfirmModal.jsx';
import {
  formatViews,
  formatDuration,
  formatTimeAgo,
  formatJoinedDate,
} from '../utils/formatters.js';
import { analyticsService, videoService } from '../services/index.js';
import { useAuthStore } from '../store/authStore.js';

export default function CreatorStudio() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  const activeTab = searchParams.get('tab') || 'dashboard';

  // ─── Authentication Guard ──────────────────────────────────
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate('/login?redirect=/studio');
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  // ─── 1. Dashboard & Analytics State ────────────────────────
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  // ─── 2. Content (Videos Management) State ──────────────────
  const [studioVideos, setStudioVideos] = useState([]);
  const [videoSearch, setVideoSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOption, setSortOption] = useState('newest');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, hasNext: false });
  const [isVideosLoading, setIsVideosLoading] = useState(false);

  // Modals state
  const [editingVideo, setEditingVideo] = useState(null);
  const [deletingVideo, setDeletingVideo] = useState(null);

  // ─── 3. Fetch Channel Analytics ────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await analyticsService.getChannel();
      if (res.data?.success) {
        setAnalyticsData(res.data.data);
      }
    } catch (err) {
      console.warn('Analytics fetch error:', err);
      setAnalyticsError(err.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, [isAuthenticated]);

  // ─── 4. Fetch Studio Videos ────────────────────────────────
  const fetchStudioVideos = useCallback(
    async (page = 1) => {
      if (!isAuthenticated) return;
      setIsVideosLoading(true);
      try {
        const res = await videoService.getStudioVideos({
          search: videoSearch,
          visibility: visibilityFilter,
          type: typeFilter,
          sort: sortOption,
          page,
          limit: 10,
        });

        if (res.data?.success) {
          setStudioVideos(res.data.data?.videos || []);
          setPagination(
            res.data.data?.pagination || { page, limit: 10, total: 0, hasNext: false }
          );
        }
      } catch (err) {
        console.warn('Studio videos fetch error:', err);
      } finally {
        setIsVideosLoading(false);
      }
    },
    [isAuthenticated, videoSearch, visibilityFilter, typeFilter, sortOption]
  );

  // Sync tab data fetching
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'dashboard' || activeTab === 'analytics') {
      fetchAnalytics();
    }
    if (activeTab === 'content') {
      fetchStudioVideos(1);
    }
  }, [activeTab, isAuthenticated, fetchAnalytics, fetchStudioVideos]);

  // Handle Tab Switch
  const handleTabChange = (tabKey) => {
    setSearchParams(tabKey === 'dashboard' ? {} : { tab: tabKey });
  };

  // Video edited callback
  const handleVideoUpdated = (updated) => {
    setStudioVideos((prev) => prev.map((v) => (v._id === updated._id ? { ...v, ...updated } : v)));
    // Also update analytics cache
    fetchAnalytics();
  };

  // Video deleted callback
  const handleVideoDeleted = (deletedId) => {
    setStudioVideos((prev) => prev.filter((v) => v._id !== deletedId));
    setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    fetchAnalytics();
  };

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 text-[#FF3038] animate-spin" />
      </div>
    );
  }

  const overview = analyticsData?.overview || {
    subscribers: user?.subscriberCount || 0,
    totalVideos: user?.videoCount || 0,
    totalViews: user?.totalViews || 0,
    totalLikes: 0,
    totalComments: 0,
  };

  const latestVideo = analyticsData?.latestVideoPerformance;
  const recentVideos = analyticsData?.recentVideos || [];
  const topVideos = analyticsData?.topVideos || [];

  return (
    <div className="max-w-7xl mx-auto py-2 sm:py-4 flex flex-col gap-6">
      {/* ─── Studio Top Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-[#17171D]/80 border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF3038] to-[#FF6067] flex items-center justify-center shadow-lg shadow-[#FF3038]/30">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              Creator Studio
            </h1>
            <p className="text-xs text-zinc-400">
              Manage your channel, content, and real-time audience performance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to={`/@${user?.username}`}>
            <Button variant="ghost" size="sm" leftIcon={ExternalLink}>
              View Channel
            </Button>
          </Link>
          <Link to="/upload">
            <Button
              variant="primary"
              size="sm"
              leftIcon={Upload}
              className="shadow-lg shadow-[#FF3038]/30"
            >
              Upload Video
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Studio Navigation Tabs ────────────────────────────── */}
      <div className="border-b border-[#23232C] px-2 sm:px-4">
        <nav className="flex space-x-2 sm:space-x-8" role="tablist">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { key: 'content', label: 'Content', icon: Film },
            { key: 'analytics', label: 'Analytics', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 py-3 px-3 text-sm sm:text-base font-semibold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#FF3038] text-white font-bold'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF3038]' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DASHBOARD                                         */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          {/* Key Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#17171D]/60 border border-white/5 flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Total Subscribers
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {formatViews(overview.subscribers).replace('views', '')}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">Real-time count</span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#17171D]/60 border border-white/5 flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Total Views
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {formatViews(overview.totalViews).replace('views', '')}
              </span>
              <span className="text-[11px] text-zinc-500">Across all uploads</span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#17171D]/60 border border-white/5 flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Total Uploads
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {overview.totalVideos}
              </span>
              <span className="text-[11px] text-zinc-500">Videos &amp; Shorts</span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#17171D]/60 border border-white/5 flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Total Likes
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {formatViews(overview.totalLikes).replace('views', '')}
              </span>
              <span className="text-[11px] text-zinc-500">Community reactions</span>
            </div>
          </div>

          {/* Main Grid: Latest Video Performance + Recent Uploads */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Latest Video Performance */}
            <div className="lg:col-span-1 p-5 sm:p-6 rounded-3xl bg-[#17171D]/60 border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF3038]" />
                    <span>Latest Video Performance</span>
                  </h3>
                </div>

                {latestVideo ? (
                  <div className="flex flex-col gap-3">
                    <Link
                      to={`/watch/${latestVideo._id}`}
                      className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black group"
                    >
                      <img
                        src={
                          latestVideo.thumbnail ||
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                        }
                        alt={latestVideo.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {latestVideo.duration > 0 && (
                        <div className="absolute bottom-2 right-2">
                          <Badge variant="duration">{formatDuration(latestVideo.duration)}</Badge>
                        </div>
                      )}
                    </Link>

                    <Link
                      to={`/watch/${latestVideo._id}`}
                      className="text-sm font-bold text-white hover:text-[#FF3038] transition-colors line-clamp-2"
                    >
                      {latestVideo.title}
                    </Link>

                    <p className="text-xs text-zinc-500">
                      Uploaded {formatTimeAgo(latestVideo.createdAt)}
                    </p>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#0B0B0F] border border-white/5 mt-2">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Views
                        </span>
                        <span className="text-sm font-bold text-white mt-0.5">
                          {formatViews(latestVideo.views).replace('views', '')}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5" /> Likes
                        </span>
                        <span className="text-sm font-bold text-white mt-0.5">
                          {formatViews(latestVideo.likeCount).replace('views', '')}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" /> Comments
                        </span>
                        <span className="text-sm font-bold text-white mt-0.5">
                          {latestVideo.commentCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    No videos published yet. Upload your first video to see metrics here.
                  </div>
                )}
              </div>

              {latestVideo && (
                <div className="pt-4 mt-4 border-t border-white/5 flex gap-2">
                  <Link to={`/watch/${latestVideo._id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      Go to Video
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingVideo(latestVideo)}
                    className="border border-white/5"
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Recent Uploads Table */}
            <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-[#17171D]/60 border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-[#FF3038]" />
                    <span>Recent Uploads</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleTabChange('content')}
                    className="text-xs font-semibold text-[#FF3038] hover:text-[#E0222A] transition-colors"
                  >
                    See all videos
                  </button>
                </div>

                {recentVideos.length === 0 ? (
                  <div className="py-16 text-center text-xs text-zinc-500">
                    No uploads found. Click "Upload Video" above to publish content!
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-white/5">
                    {recentVideos.slice(0, 5).map((vid) => (
                      <div
                        key={vid._id}
                        className="py-3 flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={
                              vid.thumbnail?.url ||
                              vid.thumbnail ||
                              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                            }
                            alt={vid.title}
                            className="w-16 aspect-video rounded-lg object-cover bg-black shrink-0"
                          />
                          <div className="min-w-0 flex flex-col">
                            <Link
                              to={`/watch/${vid._id}`}
                              className="text-xs sm:text-sm font-semibold text-white group-hover:text-[#FF3038] transition-colors truncate"
                            >
                              {vid.title}
                            </Link>
                            <span className="text-[11px] text-zinc-500">
                              {formatTimeAgo(vid.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-zinc-400 shrink-0">
                          <span className="hidden sm:inline-block">
                            {formatViews(vid.views).replace('views', 'views')}
                          </span>
                          <span className="hidden sm:inline-block">
                            {vid.likeCount || 0} likes
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingVideo(vid)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CONTENT (VIDEO MANAGEMENT)                        */}
      {/* ======================================================== */}
      {activeTab === 'content' && (
        <div className="flex flex-col gap-5">
          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-[#17171D]/60 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
                placeholder="Filter videos by title..."
                className="w-full bg-[#0B0B0F] border border-[#23232C] focus:border-[#FF3038] text-white text-xs sm:text-sm rounded-xl pl-9 pr-4 py-2 outline-none transition-colors"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#0B0B0F] border border-[#23232C] text-xs text-zinc-300 rounded-xl px-3 py-2 outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="video">Videos</option>
                <option value="short">Shorts</option>
              </select>

              {/* Visibility Filter */}
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="bg-[#0B0B0F] border border-[#23232C] text-xs text-zinc-300 rounded-xl px-3 py-2 outline-none cursor-pointer"
              >
                <option value="all">All Visibility</option>
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-[#0B0B0F] border border-[#23232C] text-xs text-zinc-300 rounded-xl px-3 py-2 outline-none cursor-pointer"
              >
                <option value="newest">Latest Uploaded</option>
                <option value="popular">Most Viewed</option>
                <option value="likes">Most Liked</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>

          {/* Videos Table */}
          <div className="rounded-3xl bg-[#17171D]/60 border border-white/5 overflow-hidden">
            {isVideosLoading ? (
              <div className="flex justify-center items-center py-24">
                <Loader2 className="w-8 h-8 text-[#FF3038] animate-spin" />
              </div>
            ) : studioVideos.length === 0 ? (
              <div className="py-24 text-center max-w-sm mx-auto">
                <Film className="w-12 h-12 text-zinc-500 mx-auto mb-3 stroke-[1.5]" />
                <h4 className="text-base font-bold text-white mb-1">No videos found</h4>
                <p className="text-xs text-zinc-400 mb-6">
                  {videoSearch || visibilityFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your search query or filter options.'
                    : 'You haven’t uploaded any videos yet. Start sharing content today!'}
                </p>
                <Link to="/upload">
                  <Button variant="primary" size="sm" leftIcon={Upload}>
                    Upload Video
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B0B0F]/80 text-zinc-400 font-semibold uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-3.5 px-4">Video</th>
                      <th className="py-3.5 px-4">Visibility</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Views</th>
                      <th className="py-3.5 px-4">Comments</th>
                      <th className="py-3.5 px-4">Likes</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {studioVideos.map((vid) => (
                      <tr key={vid._id} className="hover:bg-white/[0.02] transition-colors group">
                        {/* Video Column */}
                        <td className="py-3 px-4 max-w-xs sm:max-w-md">
                          <div className="flex items-center gap-3">
                            <Link
                              to={vid.type === 'short' ? `/shorts/${vid._id}` : `/watch/${vid._id}`}
                              className="relative w-24 aspect-video rounded-xl overflow-hidden bg-black shrink-0"
                            >
                              <img
                                src={
                                  vid.thumbnail?.url ||
                                  vid.thumbnail ||
                                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                                }
                                alt={vid.title}
                                className="w-full h-full object-cover"
                              />
                              {vid.videoFile?.duration > 0 && (
                                <div className="absolute bottom-1 right-1">
                                  <Badge variant="duration">
                                    {formatDuration(vid.videoFile.duration)}
                                  </Badge>
                                </div>
                              )}
                            </Link>
                            <div className="min-w-0">
                              <Link
                                to={
                                  vid.type === 'short' ? `/shorts/${vid._id}` : `/watch/${vid._id}`
                                }
                                className="font-semibold text-white group-hover:text-[#FF3038] transition-colors line-clamp-1"
                              >
                                {vid.title}
                              </Link>
                              <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                                {vid.description || 'No description'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Visibility */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {vid.visibility === 'public' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <Globe className="w-3.5 h-3.5" /> Public
                            </span>
                          ) : vid.visibility === 'unlisted' ? (
                            <span className="inline-flex items-center gap-1 text-zinc-400 font-medium">
                              <EyeOff className="w-3.5 h-3.5" /> Unlisted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                              <Lock className="w-3.5 h-3.5" /> Private
                            </span>
                          )}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="capitalize text-zinc-300">{vid.type}</span>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 whitespace-nowrap text-zinc-400">
                          {formatJoinedDate(vid.createdAt)}
                        </td>

                        {/* Views */}
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-white">
                          {formatViews(vid.views).replace('views', '')}
                        </td>

                        {/* Comments */}
                        <td className="py-3 px-4 whitespace-nowrap text-zinc-300">
                          {vid.commentCount || 0}
                        </td>

                        {/* Likes */}
                        <td className="py-3 px-4 whitespace-nowrap text-zinc-300">
                          {vid.likeCount || 0}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingVideo(vid)}
                              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                              title="Edit details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <Link
                              to={vid.type === 'short' ? `/shorts/${vid._id}` : `/watch/${vid._id}`}
                              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                              title="Watch video"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeletingVideo(vid)}
                              className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ANALYTICS                                         */}
      {/* ======================================================== */}
      {activeTab === 'analytics' && (
        <div className="flex flex-col gap-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#17171D]/60 border border-white/5 flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Total Views
              </span>
              <span className="text-3xl font-extrabold text-white">
                {formatViews(overview.totalViews).replace('views', '')}
              </span>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Lifetime audience reach
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#17171D]/60 border border-white/5 flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Subscribers
              </span>
              <span className="text-3xl font-extrabold text-white">
                {formatViews(overview.subscribers).replace('views', '')}
              </span>
              <span className="text-xs text-zinc-500">Channel followers</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#17171D]/60 border border-white/5 flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Total Likes
              </span>
              <span className="text-3xl font-extrabold text-white">
                {formatViews(overview.totalLikes).replace('views', '')}
              </span>
              <span className="text-xs text-zinc-500">Audience approval</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#17171D]/60 border border-white/5 flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Total Comments
              </span>
              <span className="text-3xl font-extrabold text-white">{overview.totalComments}</span>
              <span className="text-xs text-zinc-500">Discussion threads</span>
            </div>
          </div>

          {/* Top Performing Videos List */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#17171D]/60 border border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#FF3038]" />
                <span>Top Performing Videos</span>
              </h3>
              <span className="text-xs text-zinc-400">Ranked by view count</span>
            </div>

            {topVideos.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No top-performing videos found.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {topVideos.map((vid, idx) => (
                  <div key={vid._id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="w-5 text-center font-bold text-sm text-zinc-500">
                        #{idx + 1}
                      </span>
                      <img
                        src={
                          vid.thumbnail?.url ||
                          vid.thumbnail ||
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                        }
                        alt={vid.title}
                        className="w-20 aspect-video rounded-xl object-cover bg-black shrink-0"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/watch/${vid._id}`}
                          className="text-xs sm:text-sm font-semibold text-white hover:text-[#FF3038] transition-colors line-clamp-1"
                        >
                          {vid.title}
                        </Link>
                        <span className="text-[11px] text-zinc-500">
                          {formatTimeAgo(vid.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-zinc-300 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-white">{formatViews(vid.views)}</span>
                        <span className="text-[10px] text-zinc-500">views</span>
                      </div>
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="font-bold text-white">{vid.likeCount || 0}</span>
                        <span className="text-[10px] text-zinc-500">likes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Modals ────────────────────────────────────────────── */}
      <EditVideoModal
        video={editingVideo}
        isOpen={Boolean(editingVideo)}
        onClose={() => setEditingVideo(null)}
        onUpdated={handleVideoUpdated}
      />

      <DeleteConfirmModal
        video={deletingVideo}
        isOpen={Boolean(deletingVideo)}
        onClose={() => setDeletingVideo(null)}
        onDeleted={handleVideoDeleted}
      />
    </div>
  );
}
