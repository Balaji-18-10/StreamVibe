import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Flame,
  Film,
  ListVideo,
  Info,
  Calendar,
  Eye,
  Users,
  Share2,
  Globe,
  Twitter,
  Instagram,
  ArrowRight,
  Loader2,
  Check,
  Sparkles,
} from 'lucide-react';
import ChannelHeader from '../components/channel/ChannelHeader.jsx';
import ChannelShortCard from '../components/channel/ChannelShortCard.jsx';
import ChannelPlaylistCard from '../components/channel/ChannelPlaylistCard.jsx';
import VideoCard from '../components/video/VideoCard.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import {
  formatViews,
  formatDuration,
  formatTimeAgo,
  formatJoinedDate,
} from '../utils/formatters.js';
import { userService, videoService, playlistService } from '../services/index.js';
import { useAuthStore } from '../store/authStore.js';

export default function Channel() {
  const { username } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const cleanUsername = (username || '').replace('@', '');
  const activeTab = searchParams.get('tab') || 'home';

  // Channel profile state
  const [channel, setChannel] = useState(null);
  const [isChannelLoading, setIsChannelLoading] = useState(true);
  const [channelError, setChannelError] = useState(null);

  // Tab data states
  // 1. Home tab state
  const [homeVideos, setHomeVideos] = useState([]);
  const [homeShorts, setHomeShorts] = useState([]);
  const [homePlaylists, setHomePlaylists] = useState([]);
  const [isHomeLoading, setIsHomeLoading] = useState(false);

  // 2. Videos tab state
  const [videos, setVideos] = useState([]);
  const [videosSort, setVideosSort] = useState('newest');
  const [videosPagination, setVideosPagination] = useState({ page: 1, limit: 12, hasNext: false });
  const [isVideosLoading, setIsVideosLoading] = useState(false);
  const [isLoadingMoreVideos, setIsLoadingMoreVideos] = useState(false);

  // 3. Shorts tab state
  const [shorts, setShorts] = useState([]);
  const [shortsSort, setShortsSort] = useState('newest');
  const [shortsPagination, setShortsPagination] = useState({ page: 1, limit: 18, hasNext: false });
  const [isShortsLoading, setIsShortsLoading] = useState(false);
  const [isLoadingMoreShorts, setIsLoadingMoreShorts] = useState(false);

  // 4. Playlists tab state
  const [playlists, setPlaylists] = useState([]);
  const [isPlaylistsLoading, setIsPlaylistsLoading] = useState(false);

  // Share state for About tab
  const [aboutShareCopied, setAboutShareCopied] = useState(false);

  const isOwner = Boolean(user?._id && channel?._id && String(user._id) === String(channel._id));

  // ─── 1. Fetch Channel Profile ────────────────────────────────
  const fetchChannelProfile = useCallback(async () => {
    if (!cleanUsername) return;
    setIsChannelLoading(true);
    setChannelError(null);

    try {
      const res = await userService.getChannel(cleanUsername);
      if (res.data?.success && res.data.data?.channel) {
        setChannel(res.data.data.channel);
      } else {
        setChannelError('Channel not found.');
      }
    } catch (err) {
      console.error('Channel fetch error:', err);
      setChannelError(err.response?.data?.message || 'Channel not found.');
    } finally {
      setIsChannelLoading(false);
    }
  }, [cleanUsername]);

  useEffect(() => {
    fetchChannelProfile();
  }, [fetchChannelProfile]);

  // ─── 2. Fetch Home Tab Data ──────────────────────────────────
  const fetchHomeData = useCallback(async () => {
    if (!cleanUsername || !channel?._id) return;
    setIsHomeLoading(true);
    try {
      const [videosRes, shortsRes, playlistsRes] = await Promise.all([
        videoService.getChannelVideos(cleanUsername, { type: 'video', limit: 8, sort: 'newest' }),
        videoService.getChannelVideos(cleanUsername, { type: 'short', limit: 6, sort: 'popular' }),
        isOwner
          ? playlistService.getByUser(channel._id)
          : userService.getPlaylists(cleanUsername),
      ]);

      if (videosRes.data?.success) {
        setHomeVideos(videosRes.data.data?.videos || []);
      }
      if (shortsRes.data?.success) {
        setHomeShorts(shortsRes.data.data?.videos || []);
      }
      if (playlistsRes.data?.success) {
        setHomePlaylists(playlistsRes.data.data?.playlists || []);
      }
    } catch (err) {
      console.warn('Home tab data error:', err);
    } finally {
      setIsHomeLoading(false);
    }
  }, [cleanUsername, channel?._id, isOwner]);

  // ─── 3. Fetch Videos Tab Data ────────────────────────────────
  const fetchVideosData = useCallback(
    async (sort = 'newest') => {
      if (!cleanUsername) return;
      setIsVideosLoading(true);
      try {
        const res = await videoService.getChannelVideos(cleanUsername, {
          type: 'video',
          sort,
          page: 1,
          limit: 12,
        });
        if (res.data?.success) {
          setVideos(res.data.data?.videos || []);
          setVideosPagination(
            res.data.data?.pagination || { page: 1, limit: 12, hasNext: false }
          );
        }
      } catch (err) {
        console.warn('Videos tab data error:', err);
      } finally {
        setIsVideosLoading(false);
      }
    },
    [cleanUsername]
  );

  const handleLoadMoreVideos = async () => {
    if (isLoadingMoreVideos || !videosPagination.hasNext) return;
    setIsLoadingMoreVideos(true);
    try {
      const nextPage = videosPagination.page + 1;
      const res = await videoService.getChannelVideos(cleanUsername, {
        type: 'video',
        sort: videosSort,
        page: nextPage,
        limit: 12,
      });
      if (res.data?.success) {
        const newVids = res.data.data?.videos || [];
        setVideos((prev) => {
          const ids = new Set(prev.map((v) => v._id));
          return [...prev, ...newVids.filter((v) => !ids.has(v._id))];
        });
        setVideosPagination(
          res.data.data?.pagination || { page: nextPage, limit: 12, hasNext: false }
        );
      }
    } catch (err) {
      console.warn('Load more videos error:', err);
    } finally {
      setIsLoadingMoreVideos(false);
    }
  };

  // ─── 4. Fetch Shorts Tab Data ────────────────────────────────
  const fetchShortsData = useCallback(
    async (sort = 'newest') => {
      if (!cleanUsername) return;
      setIsShortsLoading(true);
      try {
        const res = await videoService.getChannelVideos(cleanUsername, {
          type: 'short',
          sort,
          page: 1,
          limit: 18,
        });
        if (res.data?.success) {
          setShorts(res.data.data?.videos || []);
          setShortsPagination(
            res.data.data?.pagination || { page: 1, limit: 18, hasNext: false }
          );
        }
      } catch (err) {
        console.warn('Shorts tab data error:', err);
      } finally {
        setIsShortsLoading(false);
      }
    },
    [cleanUsername]
  );

  const handleLoadMoreShorts = async () => {
    if (isLoadingMoreShorts || !shortsPagination.hasNext) return;
    setIsLoadingMoreShorts(true);
    try {
      const nextPage = shortsPagination.page + 1;
      const res = await videoService.getChannelVideos(cleanUsername, {
        type: 'short',
        sort: shortsSort,
        page: nextPage,
        limit: 18,
      });
      if (res.data?.success) {
        const newShorts = res.data.data?.videos || [];
        setShorts((prev) => {
          const ids = new Set(prev.map((s) => s._id));
          return [...prev, ...newShorts.filter((s) => !ids.has(s._id))];
        });
        setShortsPagination(
          res.data.data?.pagination || { page: nextPage, limit: 18, hasNext: false }
        );
      }
    } catch (err) {
      console.warn('Load more shorts error:', err);
    } finally {
      setIsLoadingMoreShorts(false);
    }
  };

  // ─── 5. Fetch Playlists Tab Data ─────────────────────────────
  const fetchPlaylistsData = useCallback(async () => {
    if (!cleanUsername || !channel?._id) return;
    setIsPlaylistsLoading(true);
    try {
      const res = isOwner
        ? await playlistService.getByUser(channel._id)
        : await userService.getPlaylists(cleanUsername);

      if (res.data?.success) {
        setPlaylists(res.data.data?.playlists || []);
      }
    } catch (err) {
      console.warn('Playlists tab error:', err);
    } finally {
      setIsPlaylistsLoading(false);
    }
  }, [cleanUsername, channel?._id, isOwner]);

  // ─── 6. Trigger data fetch based on active tab ───────────────
  useEffect(() => {
    if (!channel) return;

    if (activeTab === 'home') {
      fetchHomeData();
    } else if (activeTab === 'videos') {
      fetchVideosData(videosSort);
    } else if (activeTab === 'shorts') {
      fetchShortsData(shortsSort);
    } else if (activeTab === 'playlists') {
      fetchPlaylistsData();
    }
  }, [
    activeTab,
    channel,
    fetchHomeData,
    fetchVideosData,
    videosSort,
    fetchShortsData,
    shortsSort,
    fetchPlaylistsData,
  ]);

  // Tab switch handler
  const handleTabChange = (tabKey) => {
    setSearchParams(tabKey === 'home' ? {} : { tab: tabKey });
  };

  // ─── 7. Loading & Error States ───────────────────────────────
  if (isChannelLoading) {
    return (
      <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4">
        {/* Banner Skeleton */}
        <div className="w-full h-36 sm:h-52 md:h-64 lg:h-72 rounded-3xl bg-[#17171D] animate-pulse border border-white/5" />
        {/* Info Skeleton */}
        <div className="px-4 flex flex-col sm:flex-row gap-5 -mt-12 sm:-mt-16 z-10 relative">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/10 ring-8 ring-[#0B0B0F] animate-pulse" />
          <div className="flex-1 flex flex-col gap-2 pt-2">
            <div className="w-48 h-6 rounded bg-white/10" />
            <div className="w-64 h-4 rounded bg-white/5" />
            <div className="w-96 h-3 rounded bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (channelError || !channel) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <ErrorState
          title="Channel Not Found"
          message={
            channelError ||
            "This channel doesn't exist or may have been deleted. Check the URL and try again."
          }
          onRetry={fetchChannelProfile}
        />
      </div>
    );
  }

  const tabs = [
    { key: 'home', label: 'Home' },
    { key: 'videos', label: 'Videos' },
    { key: 'shorts', label: 'Shorts' },
    { key: 'playlists', label: 'Playlists' },
    { key: 'about', label: 'About' },
  ];

  // Featured video for Home tab
  const featuredVideo = homeVideos.length > 0 ? homeVideos[0] : null;

  return (
    <div className="max-w-7xl mx-auto py-2 sm:py-4">
      {/* ─── 1. Channel Header ─────────────────────────────────── */}
      <ChannelHeader
        channel={channel}
        isOwner={isOwner}
        onOpenAboutTab={() => handleTabChange('about')}
      />

      {/* ─── 2. Channel Navigation Tabs ────────────────────────── */}
      <div className="border-b border-[#23232C] mb-6 px-1 sm:px-4">
        <nav className="flex space-x-1 sm:space-x-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.key)}
                className={`py-3 sm:py-4 px-3 sm:px-1 text-sm sm:text-base font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#FF3038] text-white font-bold'
                    : 'border-transparent text-zinc-400 hover:text-white hover:border-white/20'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ─── 3. Tab Contents ───────────────────────────────────── */}
      <div className="px-1 sm:px-4">
        {/* ======================================================== */}
        {/* TAB 1: HOME                                              */}
        {/* ======================================================== */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-10">
            {isHomeLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#FF3038] animate-spin" />
              </div>
            ) : homeVideos.length === 0 && homeShorts.length === 0 ? (
              <div className="text-center py-20 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-[#17171D] border border-white/5 text-zinc-500 flex items-center justify-center mx-auto mb-4">
                  <Film className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No content yet</h3>
                <p className="text-xs text-zinc-400 mb-6">
                  {isOwner
                    ? 'Upload your first video or vertical short to get started!'
                    : 'This channel has not uploaded any public videos or shorts yet.'}
                </p>
                {isOwner && (
                  <Link to="/upload">
                    <Button variant="primary" size="sm">
                      Upload Video
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* ─── Featured Video Banner ──────────────────────── */}
                {featuredVideo && (
                  <div className="p-4 sm:p-6 rounded-3xl bg-[#17171D]/60 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex flex-col lg:flex-row gap-5 lg:gap-8 items-center lg:items-start">
                      {/* 16:9 Thumbnail Preview */}
                      <Link
                        to={`/watch/${featuredVideo._id}`}
                        className="relative w-full lg:w-[480px] aspect-video rounded-2xl overflow-hidden bg-black shrink-0 group/feat"
                      >
                        <img
                          src={
                            featuredVideo.thumbnail?.url ||
                            featuredVideo.thumbnail ||
                            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                          }
                          alt={featuredVideo.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/feat:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover/feat:bg-black/50 transition-colors flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-[#FF3038] text-white flex items-center justify-center shadow-2xl shadow-[#FF3038]/50 transform scale-95 group-hover/feat:scale-105 transition-transform">
                            <Play className="w-6 h-6 fill-white ml-0.5" />
                          </div>
                        </div>
                        {featuredVideo.videoFile?.duration > 0 && (
                          <div className="absolute bottom-2.5 right-2.5">
                            <Badge variant="duration">
                              {formatDuration(featuredVideo.videoFile.duration)}
                            </Badge>
                          </div>
                        )}
                      </Link>

                      {/* Info & Watch Button */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-1">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF3038]/10 text-[#FF3038] text-[11px] font-bold tracking-wide uppercase mb-3 border border-[#FF3038]/20">
                            <Sparkles className="w-3 h-3" />
                            <span>Latest Upload</span>
                          </div>

                          <Link
                            to={`/watch/${featuredVideo._id}`}
                            className="text-lg sm:text-2xl font-extrabold text-white hover:text-[#FF3038] transition-colors line-clamp-2 leading-snug mb-2"
                          >
                            {featuredVideo.title}
                          </Link>

                          <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400 mb-4 font-medium">
                            <span>{formatViews(featuredVideo.views)}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(featuredVideo.createdAt)}</span>
                          </div>

                          {featuredVideo.description && (
                            <p className="text-xs sm:text-sm text-zinc-300 line-clamp-3 leading-relaxed mb-6">
                              {featuredVideo.description}
                            </p>
                          )}
                        </div>

                        <Link to={`/watch/${featuredVideo._id}`} className="inline-block">
                          <Button variant="primary" size="md" leftIcon={Play} className="px-6">
                            Watch Now
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── Latest Videos Shelf ────────────────────────── */}
                {homeVideos.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                        <span>Latest Videos</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleTabChange('videos')}
                        className="text-xs sm:text-sm font-semibold text-[#FF3038] hover:text-[#E0222A] flex items-center gap-1 transition-colors"
                      >
                        <span>View All</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {homeVideos.slice(featuredVideo ? 1 : 0, 9).map((vid) => (
                        <VideoCard key={vid._id} video={vid} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Shorts Shelf ───────────────────────────────── */}
                {homeShorts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                        <Flame className="w-5 h-5 text-[#FF3038]" />
                        <span>Shorts</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleTabChange('shorts')}
                        className="text-xs sm:text-sm font-semibold text-[#FF3038] hover:text-[#E0222A] flex items-center gap-1 transition-colors"
                      >
                        <span>View All</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {homeShorts.slice(0, 6).map((short) => (
                        <ChannelShortCard key={short._id} short={short} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Created Playlists Shelf ────────────────────── */}
                {homePlaylists.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                        <ListVideo className="w-5 h-5 text-[#FF3038]" />
                        <span>Created Playlists</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleTabChange('playlists')}
                        className="text-xs sm:text-sm font-semibold text-[#FF3038] hover:text-[#E0222A] flex items-center gap-1 transition-colors"
                      >
                        <span>View All</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {homePlaylists.slice(0, 4).map((pl) => (
                        <ChannelPlaylistCard key={pl._id} playlist={pl} isOwner={isOwner} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: VIDEOS                                            */}
        {/* ======================================================== */}
        {activeTab === 'videos' && (
          <div>
            {/* Sort Filters */}
            <div className="flex items-center gap-2 mb-6">
              {[
                { id: 'newest', label: 'Latest' },
                { id: 'popular', label: 'Popular' },
                { id: 'oldest', label: 'Oldest' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setVideosSort(s.id);
                    fetchVideosData(s.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    videosSort === s.id
                      ? 'bg-white text-black font-bold shadow-md'
                      : 'bg-[#17171D] hover:bg-[#202028] text-zinc-300 hover:text-white border border-white/5'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {isVideosLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-3 animate-pulse">
                    <div className="w-full aspect-video rounded-2xl bg-white/10" />
                    <div className="w-3/4 h-4 rounded bg-white/10" />
                    <div className="w-1/2 h-3 rounded bg-white/5" />
                  </div>
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                <Film className="w-12 h-12 mx-auto mb-3 stroke-[1.5]" />
                <p className="text-sm">This channel has no uploaded videos.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {videos.map((vid) => (
                    <VideoCard key={vid._id} video={vid} />
                  ))}
                </div>

                {videosPagination.hasNext && (
                  <div className="flex justify-center pt-8 pb-4">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleLoadMoreVideos}
                      disabled={isLoadingMoreVideos}
                      className="px-8 border-[#23232C]"
                    >
                      {isLoadingMoreVideos ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading more...
                        </>
                      ) : (
                        'Load More Videos'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SHORTS                                            */}
        {/* ======================================================== */}
        {activeTab === 'shorts' && (
          <div>
            {/* Sort Filters */}
            <div className="flex items-center gap-2 mb-6">
              {[
                { id: 'newest', label: 'Latest' },
                { id: 'popular', label: 'Popular' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setShortsSort(s.id);
                    fetchShortsData(s.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    shortsSort === s.id
                      ? 'bg-white text-black font-bold shadow-md'
                      : 'bg-[#17171D] hover:bg-[#202028] text-zinc-300 hover:text-white border border-white/5'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {isShortsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 animate-pulse">
                    <div className="w-full aspect-[9/16] rounded-2xl bg-white/10" />
                    <div className="w-3/4 h-3.5 rounded bg-white/10" />
                    <div className="w-1/2 h-2.5 rounded bg-white/5" />
                  </div>
                ))}
              </div>
            ) : shorts.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                <Flame className="w-12 h-12 mx-auto mb-3 stroke-[1.5]" />
                <p className="text-sm">This channel has no Shorts.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {shorts.map((short) => (
                    <ChannelShortCard key={short._id} short={short} />
                  ))}
                </div>

                {shortsPagination.hasNext && (
                  <div className="flex justify-center pt-8 pb-4">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleLoadMoreShorts}
                      disabled={isLoadingMoreShorts}
                      className="px-8 border-[#23232C]"
                    >
                      {isLoadingMoreShorts ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading more...
                        </>
                      ) : (
                        'Load More Shorts'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: PLAYLISTS                                         */}
        {/* ======================================================== */}
        {activeTab === 'playlists' && (
          <div>
            {isPlaylistsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-3 animate-pulse">
                    <div className="w-full aspect-video rounded-2xl bg-white/10" />
                    <div className="w-3/4 h-4 rounded bg-white/10" />
                  </div>
                ))}
              </div>
            ) : playlists.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                <ListVideo className="w-12 h-12 mx-auto mb-3 stroke-[1.5]" />
                <p className="text-sm">This channel has no public playlists.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {playlists.map((pl) => (
                  <ChannelPlaylistCard key={pl._id} playlist={pl} isOwner={isOwner} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: ABOUT                                             */}
        {/* ======================================================== */}
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-2">
            {/* Left 2 Cols: Description & Details */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              {/* Description */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-3">
                  Description
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line bg-[#17171D]/40 p-4 sm:p-5 rounded-2xl border border-white/5">
                  {channel.bio || 'No channel description provided.'}
                </p>
              </div>

              {/* Links */}
              {channel.links && Object.values(channel.links).some(Boolean) && (
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3">
                    Links
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {channel.links.website && (
                      <a
                        href={channel.links.website.startsWith('http') ? channel.links.website : `https://${channel.links.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-xl bg-[#17171D]/60 hover:bg-[#17171D] border border-white/5 group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-[#FF3038]" />
                          <span className="text-sm font-semibold text-zinc-200 group-hover:text-white">
                            Website
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500 group-hover:text-zinc-300">
                          {channel.links.website}
                        </span>
                      </a>
                    )}
                    {channel.links.twitter && (
                      <a
                        href={`https://twitter.com/${channel.links.twitter.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-xl bg-[#17171D]/60 hover:bg-[#17171D] border border-white/5 group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Twitter className="w-4 h-4 text-sky-400" />
                          <span className="text-sm font-semibold text-zinc-200 group-hover:text-white">
                            Twitter / X
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500 group-hover:text-zinc-300">
                          @{channel.links.twitter.replace('@', '')}
                        </span>
                      </a>
                    )}
                    {channel.links.instagram && (
                      <a
                        href={`https://instagram.com/${channel.links.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-xl bg-[#17171D]/60 hover:bg-[#17171D] border border-white/5 group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Instagram className="w-4 h-4 text-pink-500" />
                          <span className="text-sm font-semibold text-zinc-200 group-hover:text-white">
                            Instagram
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500 group-hover:text-zinc-300">
                          @{channel.links.instagram.replace('@', '')}
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Col: Stats Card */}
            <div className="flex flex-col gap-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-[#17171D]/70 border border-white/5 flex flex-col gap-4">
                <h3 className="text-base font-bold text-white border-b border-white/5 pb-3">
                  Stats
                </h3>

                <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                  <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Joined {formatJoinedDate(channel.createdAt)}</span>
                </div>

                <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                  <Eye className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{formatViews(channel.totalViews || 0)}</span>
                </div>

                <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                  <Users className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{formatViews(channel.subscriberCount || 0).replace('views', 'subscribers')}</span>
                </div>

                <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                  <Film className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{channel.videoCount || 0} videos uploaded</span>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/@${channel.username}`;
                      navigator.clipboard.writeText(url);
                      setAboutShareCopied(true);
                      setTimeout(() => setAboutShareCopied(false), 2000);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-2 transition-colors"
                  >
                    {aboutShareCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>Share Channel</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
