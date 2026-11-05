import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ListVideo,
  Plus,
  Clock,
  ThumbsUp,
  Search,
  Play,
  Lock,
  Globe,
  EyeOff,
  MoreVertical,
  Trash2,
  Edit,
  Share2,
  Check,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import CreatePlaylistModal from '../components/playlist/CreatePlaylistModal.jsx';
import EditPlaylistModal from '../components/playlist/EditPlaylistModal.jsx';
import PlaylistCard from '../components/playlist/PlaylistCard.jsx';
import { playlistService, likeService } from '../services/index.js';
import { useAuthStore } from '../store/authStore.js';
import { formatTimeAgo, formatViews, formatDuration } from '../utils/formatters.js';

export default function Playlists() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  const activeTab = searchParams.get('tab') || 'all';

  // ─── Authentication Guard ──────────────────────────────────
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate('/login?redirect=/playlists');
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  const [playlists, setPlaylists] = useState([]);
  const [watchLaterPlaylist, setWatchLaterPlaylist] = useState(null);
  const [likedVideos, setLikedVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // ─── Fetch Playlists ───────────────────────────────────────
  const fetchPlaylistsData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);

    try {
      const [customRes, wlRes, likedRes] = await Promise.all([
        playlistService.getMyPlaylists(),
        playlistService.getWatchLater(),
        likeService.getLikedVideos({ limit: 50 }),
      ]);

      if (customRes.data?.success) {
        setPlaylists(customRes.data.data.playlists || []);
      }
      if (wlRes.data?.success) {
        setWatchLaterPlaylist(wlRes.data.data.playlist || null);
      }
      if (likedRes.data?.success) {
        setLikedVideos(likedRes.data.data.videos || []);
      }
    } catch (err) {
      console.warn('Playlists fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load playlists.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPlaylistsData();
  }, [fetchPlaylistsData]);

  // ─── Delete Playlist ───────────────────────────────────────
  const handleDeletePlaylist = async (playlist) => {
    if (!window.confirm(`Are you sure you want to delete playlist "${playlist.name}"? This cannot be undone.`)) {
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

  // ─── Unlike Video ──────────────────────────────────────────
  const handleUnlikeVideo = async (videoId) => {
    try {
      await likeService.toggle('video', videoId, 'like');
      setLikedVideos((prev) => prev.filter((v) => (v._id || v.id) !== videoId));
      showToast('Removed from Liked Videos');
    } catch (err) {
      showToast('Failed to remove like');
    }
  };

  // ─── Remove from Watch Later ───────────────────────────────
  const handleRemoveWatchLater = async (videoId) => {
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
      showToast('Failed to remove from Watch Later');
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const watchLaterVideos = (watchLaterPlaylist?.videos || []).map((v) => v.video).filter(Boolean);

  // Search filter
  const filteredPlaylists = searchQuery.trim()
    ? playlists.filter((p) => (p.name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : playlists;

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#17171D] border border-[#FF3038]/30 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[#FF3038]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ─── Header & Action Bar ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#23232C]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <span className="p-2 rounded-xl bg-[#FF3038]/10 text-[#FF3038] border border-[#FF3038]/20">
                <ListVideo className="w-6 h-6" />
              </span>
              Playlists
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Organize and save your favorite videos into custom playlists.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 shadow-lg shadow-[#FF3038]/20"
            >
              <Plus className="w-4 h-4" />
              New Playlist
            </Button>
          </div>
        </div>

        {/* ─── Navigation Tabs ─────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[#23232C]">
          {[
            { id: 'all', name: 'All Playlists', count: playlists.length + (watchLaterPlaylist ? 1 : 0) + (likedVideos.length > 0 ? 1 : 0) },
            { id: 'watch-later', name: 'Watch Later', count: watchLaterVideos.length, icon: Clock },
            { id: 'liked', name: 'Liked Videos', count: likedVideos.length, icon: ThumbsUp },
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
                {Icon && <Icon className={`w-4 h-4 ${active ? 'text-[#FF3038]' : 'text-zinc-400'}`} />}
                <span>{tab.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-[#FF3038]/20 text-[#FF3038]' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─── Error State ─────────────────────────────────────── */}
        {error && (
          <ErrorState
            title="Unable to load playlists"
            message={error}
            onRetry={fetchPlaylistsData}
          />
        )}

        {/* ─── Loading Skeletons ───────────────────────────────── */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-2xl bg-[#17171D] animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* ==================================================== */}
            {/* 1. ALL PLAYLISTS TAB (Custom + System Cards)        */}
            {/* ==================================================== */}
            {activeTab === 'all' && (
              <div className="space-y-8">
                {/* Search Bar */}
                {playlists.length > 3 && (
                  <div className="relative max-w-sm">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search your playlists..."
                      className="w-full bg-[#111116] border border-[#23232C] focus:border-[#FF3038] rounded-xl pl-9 pr-4 py-2 text-white text-xs outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {/* System Playlist Card 1: Watch Later */}
                  {watchLaterPlaylist && (
                    <div
                      onClick={() => navigate(`/playlists/${watchLaterPlaylist._id}`)}
                      className="group flex flex-col gap-3 w-full cursor-pointer select-none"
                    >
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#17171D] border border-amber-500/20 shadow-md group-hover:border-amber-400/50 transition-all">
                        <img
                          src={
                            watchLaterPlaylist.thumbnail ||
                            watchLaterVideos[0]?.thumbnail?.url ||
                            watchLaterVideos[0]?.thumbnail ||
                            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                          }
                          alt="Watch Later"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-y-0 right-0 w-2/5 sm:w-1/3 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 text-white border-l border-white/10">
                          <Clock className="w-5 h-5 text-amber-400" />
                          <span className="text-xs font-bold font-mono">{watchLaterVideos.length}</span>
                          <span className="text-[10px] text-zinc-400 uppercase">videos</span>
                        </div>
                      </div>

                      <div className="px-0.5">
                        <h3 className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          Watch Later
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                          <Lock className="w-3 h-3" /> Private • System Playlist
                        </p>
                      </div>
                    </div>
                  )}

                  {/* System Playlist Card 2: Liked Videos */}
                  {likedVideos.length > 0 && (
                    <div
                      onClick={() => setSearchParams({ tab: 'liked' })}
                      className="group flex flex-col gap-3 w-full cursor-pointer select-none"
                    >
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#17171D] border border-emerald-500/20 shadow-md group-hover:border-emerald-400/50 transition-all">
                        <img
                          src={
                            likedVideos[0]?.thumbnail?.url ||
                            likedVideos[0]?.thumbnail ||
                            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
                          }
                          alt="Liked Videos"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-y-0 right-0 w-2/5 sm:w-1/3 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 text-white border-l border-white/10">
                          <ThumbsUp className="w-5 h-5 text-emerald-400" />
                          <span className="text-xs font-bold font-mono">{likedVideos.length}</span>
                          <span className="text-[10px] text-zinc-400 uppercase">videos</span>
                        </div>
                      </div>

                      <div className="px-0.5">
                        <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                          <ThumbsUp className="w-4 h-4 text-emerald-400" />
                          Liked Videos
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                          <Lock className="w-3 h-3" /> Private • System Playlist
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Custom Playlists */}
                  {filteredPlaylists.map((pl) => (
                    <PlaylistCard
                      key={pl._id}
                      playlist={pl}
                      isOwner
                      onEdit={(p) => setEditingPlaylist(p)}
                      onDelete={handleDeletePlaylist}
                    />
                  ))}
                </div>

                {filteredPlaylists.length === 0 && !watchLaterPlaylist && likedVideos.length === 0 && (
                  <EmptyState
                    title="No playlists found"
                    message="Create playlists to organize tutorials, music, or gameplay videos."
                    action={
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Create Playlist
                      </Button>
                    }
                  />
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* 2. WATCH LATER TAB                                   */}
            {/* ==================================================== */}
            {activeTab === 'watch-later' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      Watch Later
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {watchLaterVideos.length} saved videos
                    </p>
                  </div>

                  {watchLaterVideos.length > 0 && (
                    <Link to={`/watch/${watchLaterVideos[0]._id || watchLaterVideos[0].id}?list=${watchLaterPlaylist?._id}`}>
                      <Button variant="primary" size="sm" className="flex items-center gap-2">
                        <Play className="w-3.5 h-3.5 fill-white" /> Play All
                      </Button>
                    </Link>
                  )}
                </div>

                {watchLaterVideos.length === 0 ? (
                  <EmptyState
                    title="No videos in Watch Later"
                    message="Save videos using the Save to Watch Later option to keep them handy."
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
                              onClick={() => handleRemoveWatchLater(id)}
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
            {/* 3. LIKED VIDEOS TAB                                  */}
            {/* ==================================================== */}
            {activeTab === 'liked' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <ThumbsUp className="w-5 h-5 text-emerald-400" />
                      Liked Videos
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {likedVideos.length} liked videos
                    </p>
                  </div>

                  {likedVideos.length > 0 && (
                    <Link to={`/watch/${likedVideos[0]._id || likedVideos[0].id}`}>
                      <Button variant="primary" size="sm" className="flex items-center gap-2">
                        <Play className="w-3.5 h-3.5 fill-white" /> Play All
                      </Button>
                    </Link>
                  )}
                </div>

                {likedVideos.length === 0 ? (
                  <EmptyState
                    title="No liked videos"
                    message="Videos that you like while browsing StreamVibe will be saved here."
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
                            </div>

                            <button
                              type="button"
                              onClick={() => handleUnlikeVideo(id)}
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
          </>
        )}

        {/* ─── Modals ────────────────────────────────────────── */}
        <CreatePlaylistModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
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