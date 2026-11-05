import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Library as LibraryIcon,
  History,
  Clock,
  ThumbsUp,
  ListVideo,
  Plus,
  Play,
  ArrowRight,
  Trash2,
  ExternalLink,
  Loader2,
  Check,
  Share2,
  Lock,
  EyeOff,
  Globe,
  Sparkles,
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import VideoCardSkeleton from '../components/ui/VideoCardSkeleton.jsx';
import CreatePlaylistModal from '../components/playlist/CreatePlaylistModal.jsx';
import EditPlaylistModal from '../components/playlist/EditPlaylistModal.jsx';
import PlaylistCard from '../components/playlist/PlaylistCard.jsx';
import {
  userService,
  likeService,
  playlistService,
} from '../services/index.js';
import { useAuthStore } from '../store/authStore.js';
import {
  formatViews,
  formatDuration,
  formatTimeAgo,
} from '../utils/formatters.js';

export default function Library() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  const activeTab = searchParams.get('tab') || 'overview';

  // ─── Authentication Guard ──────────────────────────────────
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate('/login?redirect=/library');
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  // ─── States ────────────────────────────────────────────────
  const [historyVideos, setHistoryVideos] = useState([]);
  const [watchLaterPlaylist, setWatchLaterPlaylist] = useState(null);
  const [likedVideos, setLikedVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  // ─── Load Library Data ─────────────────────────────────────
  const loadLibraryData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);

    try {
      const [historyRes, wlRes, likedRes, playlistsRes] = await Promise.all([
        userService.getHistory({ limit: 12 }),
        playlistService.getWatchLater(),
        likeService.getLikedVideos({ limit: 12 }),
        playlistService.getMyPlaylists(),
      ]);

      if (historyRes.data?.success) {
        setHistoryVideos(historyRes.data.data.videos || []);
      }
      if (wlRes.data?.success) {
        setWatchLaterPlaylist(wlRes.data.data.playlist || null);
      }
      if (likedRes.data?.success) {
        setLikedVideos(likedRes.data.data.videos || []);
      }
      if (playlistsRes.data?.success) {
        setPlaylists(playlistsRes.data.data.playlists || []);
      }
    } catch (err) {
      console.warn('Library load error:', err);
      setError(err.response?.data?.message || 'Failed to load user library.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadLibraryData();
  }, [loadLibraryData]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleRemoveHistoryItem = async (e, videoId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await userService.removeFromHistory(videoId);
      setHistoryVideos((prev) => prev.filter((v) => (v._id || v.id) !== videoId));
      showToast('Removed from history');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove from history');
    }
  };

  const handleRemoveWatchLaterItem = async (e, videoId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await playlistService.removeFromWatchLater(videoId);
      setWatchLaterPlaylist((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          videos: prev.videos.filter((item) => (item.video?._id || item.video) !== videoId),
        };
      });
      showToast('Removed from Watch Later');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove from Watch Later');
    }
  };

  const handleUnlikeVideo = async (e, videoId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await likeService.toggle('video', videoId, 'like');
      setLikedVideos((prev) => prev.filter((v) => (v._id || v.id) !== videoId));
      showToast('Removed from Liked Videos');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update like');
    }
  };

  const handleDeletePlaylist = async (playlist) => {
    if (!window.confirm(`Are you sure you want to delete playlist "${playlist.name}"?`)) {
      return;
    }
    try {
      await playlistService.delete(playlist._id);
      setPlaylists((prev) => prev.filter((p) => p._id !== playlist._id));
      showToast('Playlist deleted');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete playlist');
    }
  };

  const showToast = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(''), 2500);
  };

  const watchLaterVideos = (watchLaterPlaylist?.videos || []).map((item) => item.video).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Toast notification */}
        {actionMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#17171D] border border-[#FF3038]/30 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-[#FF3038]" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* ─── Header & Profile Summary ───────────────────────── */}
        <div className="bg-[#17171D] border border-[#23232C] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF3038]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 sm:gap-5 relative z-10 min-w-0">
            <Avatar
              src={user?.avatar?.url || user?.avatar}
              name={user?.displayName || user?.username}
              size="xl"
              border
              className="ring-2 ring-[#FF3038]/20"
            />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white truncate flex items-center gap-2">
                <span>{user?.displayName || 'Your Library'}</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 truncate font-mono">
                @{user?.username}
              </p>

              {/* Fast Stats */}
              <div className="flex items-center gap-3 sm:gap-4 text-xs text-zinc-400 mt-3 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-zinc-400" />
                  <strong className="text-white">{historyVideos.length}</strong> History
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <strong className="text-white">{watchLaterVideos.length}</strong> Watch Later
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5 text-zinc-400" />
                  <strong className="text-white">{likedVideos.length}</strong> Liked
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1.5">
                  <ListVideo className="w-3.5 h-3.5 text-zinc-400" />
                  <strong className="text-white">{playlists.length}</strong> Playlists
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 shadow-lg shadow-[#FF3038]/20"
            >
              <Plus className="w-4 h-4" />
              <span>New Playlist</span>
            </Button>
          </div>
        </div>

        {/* ─── Navigation Tabs ─────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[#23232C]">
          {[
            { id: 'overview', name: 'Overview', icon: LibraryIcon },
            { id: 'history', name: 'History', icon: History, count: historyVideos.length },
            { id: 'watch-later', name: 'Watch Later', icon: Clock, count: watchLaterVideos.length },
            { id: 'liked', name: 'Liked Videos', icon: ThumbsUp, count: likedVideos.length },
            { id: 'playlists', name: 'Playlists', icon: ListVideo, count: playlists.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-[#FF3038] text-white bg-[#FF3038]/5 rounded-t-xl'
                    : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#FF3038]' : 'text-zinc-400'}`} />
                <span>{tab.name}</span>
                {typeof tab.count === 'number' && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-[#FF3038]/20 text-[#FF3038]' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Error State ─────────────────────────────────────── */}
        {error && (
          <ErrorState
            title="Unable to load library"
            message={error}
            onRetry={loadLibraryData}
          />
        )}

        {/* ─── Loading State ───────────────────────────────────── */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* ==================================================== */}
            {/* 1. OVERVIEW VIEW (All Sections Combined)             */}
            {/* ==================================================== */}
            {activeTab === 'overview' && (
              <div className="space-y-12">
                {/* ─── SECTION 1: WATCH HISTORY ───────────────────── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                      <History className="w-5 h-5 text-[#FF3038]" />
                      <span>History</span>
                    </h2>
                    <Link
                      to="/history"
                      className="text-xs font-semibold text-[#FF3038] hover:underline flex items-center gap-1"
                    >
                      See all ({historyVideos.length})
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {historyVideos.length === 0 ? (
                    <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-6 text-center text-xs text-zinc-500">
                      No videos watched recently. Your watch history will appear here.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {historyVideos.slice(0, 4).map((vid) => {
                        const id = vid._id || vid.id;
                        return (
                          <div
                            key={id}
                            className="group relative bg-[#17171D] border border-white/5 rounded-2xl overflow-hidden hover:border-[#FF3038]/30 transition-all flex flex-col"
                          >
                            <Link to={`/watch/${id}`} className="relative aspect-video bg-black block overflow-hidden">
                              <img
                                src={
                                  vid.thumbnail?.url ||
                                  vid.thumbnail ||
                                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                                }
                                alt={vid.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              {vid.videoFile?.duration > 0 && (
                                <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                                  {formatDuration(vid.videoFile.duration)}
                                </span>
                              )}
                            </Link>

                            <div className="p-3.5 flex items-start justify-between gap-2 flex-1">
                              <div className="min-w-0 flex-1">
                                <Link
                                  to={`/watch/${id}`}
                                  className="text-xs sm:text-sm font-semibold text-white line-clamp-1 group-hover:text-[#FF3038] transition-colors"
                                  title={vid.title}
                                >
                                  {vid.title}
                                </Link>
                                <p className="text-[11px] text-zinc-400 mt-1 truncate">
                                  {vid.owner?.displayName || vid.owner?.username || 'Creator'}
                                </p>
                                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                                  {formatViews(vid.views)}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleRemoveHistoryItem(e, id)}
                                className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove from history"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ─── SECTION 2: WATCH LATER ─────────────────────── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                      <Clock className="w-5 h-5 text-amber-400" />
                      <span>Watch Later</span>
                    </h2>
                    {watchLaterPlaylist && (
                      <Link
                        to={`/playlists/${watchLaterPlaylist._id}`}
                        className="text-xs font-semibold text-[#FF3038] hover:underline flex items-center gap-1"
                      >
                        See all ({watchLaterVideos.length})
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>

                  {watchLaterVideos.length === 0 ? (
                    <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-6 text-center text-xs text-zinc-500">
                      No videos in Watch Later. Save videos to watch them later at your convenience.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {watchLaterVideos.slice(0, 4).map((vid) => {
                        const id = vid._id || vid.id;
                        return (
                          <div
                            key={id}
                            className="group relative bg-[#17171D] border border-white/5 rounded-2xl overflow-hidden hover:border-[#FF3038]/30 transition-all flex flex-col"
                          >
                            <Link to={`/watch/${id}`} className="relative aspect-video bg-black block overflow-hidden">
                              <img
                                src={
                                  vid.thumbnail?.url ||
                                  vid.thumbnail ||
                                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                                }
                                alt={vid.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              {vid.videoFile?.duration > 0 && (
                                <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                                  {formatDuration(vid.videoFile.duration)}
                                </span>
                              )}
                            </Link>

                            <div className="p-3.5 flex items-start justify-between gap-2 flex-1">
                              <div className="min-w-0 flex-1">
                                <Link
                                  to={`/watch/${id}`}
                                  className="text-xs sm:text-sm font-semibold text-white line-clamp-1 group-hover:text-[#FF3038] transition-colors"
                                  title={vid.title}
                                >
                                  {vid.title}
                                </Link>
                                <p className="text-[11px] text-zinc-400 mt-1 truncate">
                                  {vid.owner?.displayName || vid.owner?.username || 'Creator'}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleRemoveWatchLaterItem(e, id)}
                                className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove from Watch Later"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ─── SECTION 3: LIKED VIDEOS ────────────────────── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                      <ThumbsUp className="w-5 h-5 text-emerald-400" />
                      <span>Liked Videos</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSearchParams({ tab: 'liked' })}
                      className="text-xs font-semibold text-[#FF3038] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      See all ({likedVideos.length})
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {likedVideos.length === 0 ? (
                    <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-6 text-center text-xs text-zinc-500">
                      No liked videos yet. Videos you like will be saved here.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {likedVideos.slice(0, 4).map((vid) => {
                        const id = vid._id || vid.id;
                        return (
                          <div
                            key={id}
                            className="group relative bg-[#17171D] border border-white/5 rounded-2xl overflow-hidden hover:border-[#FF3038]/30 transition-all flex flex-col"
                          >
                            <Link to={`/watch/${id}`} className="relative aspect-video bg-black block overflow-hidden">
                              <img
                                src={
                                  vid.thumbnail?.url ||
                                  vid.thumbnail ||
                                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                                }
                                alt={vid.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              {vid.videoFile?.duration > 0 && (
                                <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                                  {formatDuration(vid.videoFile.duration)}
                                </span>
                              )}
                            </Link>

                            <div className="p-3.5 flex items-start justify-between gap-2 flex-1">
                              <div className="min-w-0 flex-1">
                                <Link
                                  to={`/watch/${id}`}
                                  className="text-xs sm:text-sm font-semibold text-white line-clamp-1 group-hover:text-[#FF3038] transition-colors"
                                  title={vid.title}
                                >
                                  {vid.title}
                                </Link>
                                <p className="text-[11px] text-zinc-400 mt-1 truncate">
                                  {vid.owner?.displayName || vid.owner?.username || 'Creator'}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleUnlikeVideo(e, id)}
                                className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove like"
                              >
                                <ThumbsUp className="w-3.5 h-3.5 fill-current text-[#FF3038]" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ─── SECTION 4: PLAYLISTS ───────────────────────── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                      <ListVideo className="w-5 h-5 text-indigo-400" />
                      <span>Playlists</span>
                    </h2>
                    <Link
                      to="/playlists"
                      className="text-xs font-semibold text-[#FF3038] hover:underline flex items-center gap-1"
                    >
                      See all ({playlists.length})
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {playlists.length === 0 ? (
                    <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
                      <ListVideo className="w-8 h-8 text-zinc-600" />
                      <p className="text-xs text-zinc-400">You haven't created any custom playlists yet.</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create Playlist
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {playlists.slice(0, 4).map((pl) => (
                        <PlaylistCard
                          key={pl._id}
                          playlist={pl}
                          isOwner
                          onEdit={(p) => setEditingPlaylist(p)}
                          onDelete={handleDeletePlaylist}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ==================================================== */}
            {/* 2. HISTORY TAB                                       */}
            {/* ==================================================== */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Watch History</h2>
                  <Link to="/history">
                    <Button variant="secondary" size="sm" className="flex items-center gap-2">
                      Full History Page <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>

                {historyVideos.length === 0 ? (
                  <EmptyState
                    title="No watch history"
                    message="Videos that you watch on StreamVibe will appear here."
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {historyVideos.map((vid) => {
                      const id = vid._id || vid.id;
                      return (
                        <div
                          key={id}
                          className="group relative bg-[#17171D] border border-white/5 rounded-2xl overflow-hidden hover:border-[#FF3038]/30 transition-all flex flex-col"
                        >
                          <Link to={`/watch/${id}`} className="relative aspect-video bg-black block overflow-hidden">
                            <img
                              src={
                                vid.thumbnail?.url ||
                                vid.thumbnail ||
                                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                              }
                              alt={vid.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {vid.videoFile?.duration > 0 && (
                              <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                                {formatDuration(vid.videoFile.duration)}
                              </span>
                            )}
                          </Link>

                          <div className="p-4 flex items-start justify-between gap-2 flex-1">
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/watch/${id}`}
                                className="text-sm font-semibold text-white line-clamp-1 group-hover:text-[#FF3038] transition-colors"
                              >
                                {vid.title}
                              </Link>
                              <p className="text-xs text-zinc-400 mt-1 truncate">
                                {vid.owner?.displayName || vid.owner?.username}
                              </p>
                              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                                {formatViews(vid.views)} views
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleRemoveHistoryItem(e, id)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove from history"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* 3. WATCH LATER TAB                                   */}
            {/* ==================================================== */}
            {activeTab === 'watch-later' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Watch Later</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {watchLaterVideos.length} saved {watchLaterVideos.length === 1 ? 'video' : 'videos'}
                    </p>
                  </div>

                  {watchLaterVideos.length > 0 && (
                    <Link to={`/watch/${watchLaterVideos[0]._id || watchLaterVideos[0].id}?list=${watchLaterPlaylist?._id}`}>
                      <Button variant="primary" size="sm" className="flex items-center gap-2">
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Play All
                      </Button>
                    </Link>
                  )}
                </div>

                {watchLaterVideos.length === 0 ? (
                  <EmptyState
                    title="Watch Later is empty"
                    message="Save videos using the Save button on any video to watch them later."
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {watchLaterVideos.map((vid) => {
                      const id = vid._id || vid.id;
                      return (
                        <div
                          key={id}
                          className="group relative bg-[#17171D] border border-white/5 rounded-2xl overflow-hidden hover:border-[#FF3038]/30 transition-all flex flex-col"
                        >
                          <Link to={`/watch/${id}`} className="relative aspect-video bg-black block overflow-hidden">
                            <img
                              src={
                                vid.thumbnail?.url ||
                                vid.thumbnail ||
                                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                              }
                              alt={vid.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {vid.videoFile?.duration > 0 && (
                              <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                                {formatDuration(vid.videoFile.duration)}
                              </span>
                            )}
                          </Link>

                          <div className="p-4 flex items-start justify-between gap-2 flex-1">
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/watch/${id}`}
                                className="text-sm font-semibold text-white line-clamp-1 group-hover:text-[#FF3038] transition-colors"
                              >
                                {vid.title}
                              </Link>
                              <p className="text-xs text-zinc-400 mt-1 truncate">
                                {vid.owner?.displayName || vid.owner?.username}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleRemoveWatchLaterItem(e, id)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove from Watch Later"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* 4. LIKED VIDEOS TAB                                  */}
            {/* ==================================================== */}
            {activeTab === 'liked' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Liked Videos</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {likedVideos.length} liked {likedVideos.length === 1 ? 'video' : 'videos'}
                    </p>
                  </div>

                  {likedVideos.length > 0 && (
                    <Link to={`/watch/${likedVideos[0]._id || likedVideos[0].id}`}>
                      <Button variant="primary" size="sm" className="flex items-center gap-2">
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Play All
                      </Button>
                    </Link>
                  )}
                </div>

                {likedVideos.length === 0 ? (
                  <EmptyState
                    title="No liked videos"
                    message="Videos that you like across StreamVibe will be gathered here."
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {likedVideos.map((vid) => {
                      const id = vid._id || vid.id;
                      return (
                        <div
                          key={id}
                          className="group relative bg-[#17171D] border border-white/5 rounded-2xl overflow-hidden hover:border-[#FF3038]/30 transition-all flex flex-col"
                        >
                          <Link to={`/watch/${id}`} className="relative aspect-video bg-black block overflow-hidden">
                            <img
                              src={
                                vid.thumbnail?.url ||
                                vid.thumbnail ||
                                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                              }
                              alt={vid.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {vid.videoFile?.duration > 0 && (
                              <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                                {formatDuration(vid.videoFile.duration)}
                              </span>
                            )}
                          </Link>

                          <div className="p-4 flex items-start justify-between gap-2 flex-1">
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/watch/${id}`}
                                className="text-sm font-semibold text-white line-clamp-1 group-hover:text-[#FF3038] transition-colors"
                              >
                                {vid.title}
                              </Link>
                              <p className="text-xs text-zinc-400 mt-1 truncate">
                                {vid.owner?.displayName || vid.owner?.username}
                              </p>
                              {vid.likedAt && (
                                <span className="text-[10px] text-zinc-500 mt-1 block">
                                  Liked {formatTimeAgo(vid.likedAt)}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleUnlikeVideo(e, id)}
                              className="p-1.5 rounded-lg text-[#FF3038] hover:bg-[#FF3038]/10 transition-colors"
                              title="Unlike video"
                            >
                              <ThumbsUp className="w-4 h-4 fill-current" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* 5. PLAYLISTS TAB                                     */}
            {/* ==================================================== */}
            {activeTab === 'playlists' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">My Playlists</h2>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Playlist
                  </Button>
                </div>

                {playlists.length === 0 ? (
                  <EmptyState
                    title="No playlists created"
                    message="Group your favorite videos into custom playlists to share or keep private."
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create First Playlist
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {playlists.map((pl) => (
                      <PlaylistCard
                        key={pl._id}
                        playlist={pl}
                        isOwner
                        onEdit={(p) => setEditingPlaylist(p)}
                        onDelete={handleDeletePlaylist}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ─── Modals ────────────────────────────────────────── */}
        <CreatePlaylistModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(newPl) => {
            setPlaylists((prev) => [newPl, ...prev]);
            showToast(`Created playlist "${newPl.name}"`);
          }}
        />

        <EditPlaylistModal
          playlist={editingPlaylist}
          isOpen={Boolean(editingPlaylist)}
          onClose={() => setEditingPlaylist(null)}
          onUpdated={(updatedPl) => {
            setPlaylists((prev) =>
              prev.map((p) => (p._id === updatedPl._id ? updatedPl : p))
            );
            showToast(`Updated playlist "${updatedPl.name}"`);
          }}
        />
      </div>
    </div>
  );
}