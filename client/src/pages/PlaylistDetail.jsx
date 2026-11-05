import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ListVideo,
  Play,
  Share2,
  Trash2,
  Edit,
  Globe,
  Lock,
  EyeOff,
  MoveUp,
  MoveDown,
  Clock,
  Check,
  Loader2,
  X,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EditPlaylistModal from '../components/playlist/EditPlaylistModal.jsx';
import { playlistService } from '../services/index.js';
import { useAuthStore } from '../store/authStore.js';
import { formatViews, formatDuration, formatTimeAgo } from '../utils/formatters.js';

export default function PlaylistDetail() {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // Edit / Delete Modals & Toast
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isReordering, setIsReordering] = useState(false);

  // ─── Fetch Playlist ────────────────────────────────────────
  const fetchPlaylist = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsForbidden(false);

    try {
      const res = await playlistService.getById(playlistId);
      if (res.data?.success) {
        const pl = res.data.data.playlist;
        setPlaylist(pl);
        // Valid videos
        const validVideos = (pl.videos || [])
          .filter((item) => item.video != null)
          .map((item, idx) => ({
            ...item.video,
            playlistItemId: item._id,
            position: typeof item.position === 'number' ? item.position : idx,
            addedAt: item.addedAt,
          }));
        setVideos(validVideos);
      } else {
        setError(res.data?.message || 'Playlist not found.');
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setIsForbidden(true);
      } else {
        setError(err.response?.data?.message || 'Failed to load playlist.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const isOwner = Boolean(
    isAuthenticated &&
    user?._id &&
    playlist?.owner?._id &&
    String(user._id) === String(playlist.owner._id)
  );

  // ─── Delete Playlist ───────────────────────────────────────
  const handleDeletePlaylist = async () => {
    if (!window.confirm(`Are you sure you want to delete playlist "${playlist.name}"?`)) {
      return;
    }
    try {
      await playlistService.delete(playlist._id);
      navigate('/playlists');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete playlist');
    }
  };

  // ─── Remove Video from Playlist ────────────────────────────
  const handleRemoveVideo = async (videoId) => {
    try {
      await playlistService.removeVideo(playlist._id, videoId);
      setVideos((prev) => prev.filter((v) => (v._id || v.id) !== videoId));
      showToast('Video removed from playlist');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove video');
    }
  };

  // ─── Reorder Videos ────────────────────────────────────────
  const handleMoveVideo = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= videos.length) return;

    const newVideos = [...videos];
    const [moved] = newVideos.splice(index, 1);
    newVideos.splice(targetIndex, 0, moved);

    setVideos(newVideos);
    setIsReordering(true);

    try {
      const videoIds = newVideos.map((v) => v._id || v.id);
      await playlistService.reorder(playlist._id, videoIds);
      showToast('Playlist order updated');
    } catch (err) {
      showToast('Failed to save playlist order');
      // Revert
      fetchPlaylist();
    } finally {
      setIsReordering(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Playlist link copied to clipboard');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  if (isForbidden) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">This Playlist is Private</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The creator has made this playlist private. Only the playlist owner has access to view its contents.
        </p>
        <Link to="/playlists">
          <Button variant="secondary" size="sm" className="mt-2">
            Back to Playlists
          </Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16">
        <ErrorState
          title="Playlist Unavailable"
          message={error}
          onRetry={fetchPlaylist}
        />
      </div>
    );
  }

  if (isLoading || !playlist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#FF3038] animate-spin" />
        <span className="text-xs text-zinc-400">Loading playlist details...</span>
      </div>
    );
  }

  const firstVideoId = videos[0]?._id || videos[0]?.id;
  const playAllUrl = firstVideoId ? `/watch/${firstVideoId}?list=${playlist._id}` : null;

  const totalDuration = videos.reduce((acc, v) => acc + (v.videoFile?.duration || v.duration || 0), 0);

  const bannerThumbnail =
    playlist.thumbnail ||
    videos[0]?.thumbnail?.url ||
    videos[0]?.thumbnail ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';

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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ─── Left Column: Playlist Card & Metadata (4 cols) ─ */}
          <div className="lg:col-span-4 bg-[#17171D] border border-[#23232C] rounded-3xl p-6 lg:sticky lg:top-20 shadow-xl space-y-6">
            {/* Thumbnail Poster */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg group">
              <img
                src={bannerThumbnail}
                alt={playlist.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {playAllUrl && (
                  <Link to={playAllUrl}>
                    <div className="w-12 h-12 rounded-full bg-[#FF3038] text-white flex items-center justify-center shadow-lg shadow-[#FF3038]/30">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </Link>
                )}
              </div>
            </div>

            {/* Playlist Title & Visibility */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {playlist.visibility === 'public' && (
                  <Badge variant="success" size="sm">
                    <Globe className="w-3 h-3 mr-1" /> Public
                  </Badge>
                )}
                {playlist.visibility === 'unlisted' && (
                  <Badge variant="warning" size="sm">
                    <EyeOff className="w-3 h-3 mr-1" /> Unlisted
                  </Badge>
                )}
                {playlist.visibility === 'private' && (
                  <Badge variant="default" size="sm">
                    <Lock className="w-3 h-3 mr-1" /> Private
                  </Badge>
                )}
                {playlist.isSystem && (
                  <Badge variant="primary" size="sm">
                    System
                  </Badge>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {playlist.name}
              </h1>

              {playlist.description && (
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  {playlist.description}
                </p>
              )}
            </div>

            {/* Creator Information */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              <Link to={`/@${playlist.owner?.username}`}>
                <Avatar
                  src={playlist.owner?.avatar?.url || playlist.owner?.avatar}
                  name={playlist.owner?.displayName || playlist.owner?.username}
                  size="sm"
                />
              </Link>
              <div className="min-w-0">
                <Link
                  to={`/@${playlist.owner?.username}`}
                  className="text-xs font-bold text-white hover:text-[#FF3038] transition-colors truncate block"
                >
                  {playlist.owner?.displayName || playlist.owner?.username}
                </Link>
                <span className="text-[11px] text-zinc-500 font-mono">
                  @{playlist.owner?.username}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400 py-3 border-y border-white/5">
              <div>
                <span className="text-[11px] text-zinc-500 block">Total Videos</span>
                <strong className="text-white font-mono text-sm">{videos.length}</strong>
              </div>
              {totalDuration > 0 && (
                <div>
                  <span className="text-[11px] text-zinc-500 block">Total Duration</span>
                  <strong className="text-white font-mono text-sm">{formatDuration(totalDuration)}</strong>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {playAllUrl ? (
                <Link to={playAllUrl} className="block">
                  <Button variant="primary" size="md" className="w-full flex items-center justify-center gap-2 shadow-lg shadow-[#FF3038]/20">
                    <Play className="w-4 h-4 fill-white" />
                    Play All
                  </Button>
                </Link>
              ) : (
                <Button variant="primary" size="md" disabled className="w-full opacity-50">
                  Play All (Empty)
                </Button>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </Button>

                {isOwner && !playlist.isSystem && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditOpen(true)}
                      className="flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeletePlaylist}
                      className="text-red-400 hover:text-red-300 border-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ─── Right Column: Videos List (8 cols) ───────────── */}
          <div className="lg:col-span-8 space-y-4">
            {videos.length === 0 ? (
              <EmptyState
                title="This playlist has no videos"
                message="Add videos to this playlist while watching or exploring StreamVibe."
                action={
                  <Link to="/">
                    <Button variant="secondary" size="sm" className="flex items-center gap-2">
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Browse Videos
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {videos.map((vid, idx) => {
                  const id = vid._id || vid.id;
                  const owner = vid.owner || {};

                  return (
                    <div
                      key={vid.playlistItemId || id}
                      className="group flex items-center gap-3 sm:gap-4 p-3 rounded-2xl bg-[#17171D] border border-white/5 hover:border-[#FF3038]/30 transition-all hover:bg-[#1C1C24]"
                    >
                      {/* Position number */}
                      <span className="w-6 text-center text-xs font-mono font-bold text-zinc-500 group-hover:text-white shrink-0">
                        {idx + 1}
                      </span>

                      {/* Video Thumbnail */}
                      <Link
                        to={`/watch/${id}?list=${playlist._id}`}
                        className="relative w-36 sm:w-44 aspect-video rounded-xl overflow-hidden bg-black shrink-0 block"
                      >
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
                          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                            {formatDuration(vid.videoFile.duration)}
                          </span>
                        )}
                      </Link>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/watch/${id}?list=${playlist._id}`}
                          className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-[#FF3038] transition-colors"
                          title={vid.title}
                        >
                          {vid.title}
                        </Link>

                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                          <Link
                            to={`/@${owner.username}`}
                            className="hover:text-white transition-colors truncate max-w-[150px]"
                          >
                            {owner.displayName || owner.username}
                          </Link>
                          <span>•</span>
                          <span className="text-zinc-500">{formatViews(vid.views)}</span>
                        </div>
                      </div>

                      {/* Owner controls: Reorder & Remove */}
                      {isOwner && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveVideo(idx, 'up')}
                            disabled={idx === 0 || isReordering}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveVideo(idx, 'down')}
                            disabled={idx === videos.length - 1 || isReordering}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveVideo(id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                            title="Remove from playlist"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Edit Modal ─────────────────────────────────────── */}
        <EditPlaylistModal
          playlist={playlist}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onUpdated={(updatedPl) => {
            setPlaylist((prev) => ({ ...prev, ...updatedPl }));
            showToast('Playlist updated successfully');
          }}
        />
      </div>
    </div>
  );
}