import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History as HistoryIcon,
  Search,
  Trash2,
  X,
  Play,
  Clock,
  Eye,
  AlertCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import VideoCardSkeleton from '../components/ui/VideoCardSkeleton.jsx';
import { userService } from '../services/index.js';
import { useAuthStore } from '../store/authStore.js';
import { formatViews, formatDuration, formatTimeAgo } from '../utils/formatters.js';

export default function History() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  // ─── Authentication Guard ──────────────────────────────────
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate('/login?redirect=/history');
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 16, total: 0, hasNext: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Clear confirmation modal state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // ─── Fetch History ─────────────────────────────────────────
  const fetchHistory = useCallback(async (page = 1, append = false) => {
    if (!isAuthenticated) return;
    if (page === 1) setIsLoading(true);
    else setIsLoadingMore(true);
    setError(null);

    try {
      const res = await userService.getHistory({ page, limit: 16 });
      if (res.data?.success) {
        const fetchedVideos = res.data.data.videos || [];
        const pag = res.data.data.pagination || { page: 1, limit: 16, total: fetchedVideos.length, hasNext: false };

        setVideos((prev) => (append ? [...prev, ...fetchedVideos] : fetchedVideos));
        setPagination(pag);
      } else {
        setError(res.data?.message || 'Failed to load history.');
      }
    } catch (err) {
      console.warn('History fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load watch history.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  const handleLoadMore = () => {
    if (!pagination.hasNext || isLoadingMore) return;
    fetchHistory(pagination.page + 1, true);
  };

  // ─── Remove Item ───────────────────────────────────────────
  const handleRemoveItem = async (e, videoId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await userService.removeFromHistory(videoId);
      setVideos((prev) => prev.filter((v) => (v._id || v.id) !== videoId));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      showToast('Video removed from watch history');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove video');
    }
  };

  // ─── Clear All History ─────────────────────────────────────
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await userService.clearHistory();
      setVideos([]);
      setPagination({ page: 1, limit: 16, total: 0, hasNext: false });
      setShowClearConfirm(false);
      showToast('Watch history cleared');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to clear watch history');
    } finally {
      setIsClearing(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Local filter for search within history
  const filteredVideos = searchQuery.trim()
    ? videos.filter((v) =>
        (v.title || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        (v.owner?.displayName || v.owner?.username || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : videos;

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#17171D] border border-[#FF3038]/30 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[#FF3038]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ─── Header & Actions ───────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#23232C]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <span className="p-2 rounded-xl bg-[#FF3038]/10 text-[#FF3038] border border-[#FF3038]/20">
                <HistoryIcon className="w-6 h-6" />
              </span>
              Watch History
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Pick up where you left off. Videos are recorded in your history when you watch them.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {videos.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="text-red-400 border-red-500/20 hover:bg-red-500/10 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear All History
              </Button>
            )}
          </div>
        </div>

        {/* ─── Search & Controls Bar ──────────────────────────── */}
        {videos.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#17171D] border border-[#23232C] rounded-2xl p-3 sm:p-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search watch history..."
                className="w-full bg-[#111116] border border-[#23232C] focus:border-[#FF3038] rounded-xl pl-9 pr-9 py-2 text-white text-xs outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <span>Total watched: <strong className="text-white">{pagination.total || videos.length}</strong> videos</span>
            </div>
          </div>
        )}

        {/* ─── Error State ─────────────────────────────────────── */}
        {error && (
          <ErrorState
            title="Failed to load watch history"
            message={error}
            onRetry={() => fetchHistory(1)}
          />
        )}

        {/* ─── Loading Skeletons ───────────────────────────────── */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-3 rounded-2xl bg-[#17171D] border border-white/5 animate-pulse">
                <div className="w-48 aspect-video rounded-xl bg-zinc-800" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-zinc-800 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Empty State ─────────────────────────────────────── */}
        {!isLoading && !error && videos.length === 0 && (
          <EmptyState
            title="No watch history yet"
            message="Videos that you watch on StreamVibe will appear here so you can easily continue watching or find them again."
            action={
              <Link to="/">
                <Button variant="primary" size="sm" className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Explore Videos
                </Button>
              </Link>
            }
          />
        )}

        {/* ─── Search No Results ───────────────────────────────── */}
        {!isLoading && !error && videos.length > 0 && filteredVideos.length === 0 && (
          <div className="py-12 text-center text-zinc-400 space-y-2">
            <p className="text-sm font-semibold text-white">No history matching "{searchQuery}"</p>
            <p className="text-xs text-zinc-500">Try searching for a different title or creator.</p>
          </div>
        )}

        {/* ─── Videos List (Horizontal row format like YouTube) ── */}
        {!isLoading && !error && filteredVideos.length > 0 && (
          <div className="space-y-4">
            {filteredVideos.map((vid) => {
              const id = vid._id || vid.id;
              const owner = vid.owner || {};

              return (
                <div
                  key={id}
                  className="group relative flex flex-col sm:flex-row gap-4 p-3 sm:p-4 rounded-2xl bg-[#17171D] border border-white/5 hover:border-[#FF3038]/30 transition-all hover:bg-[#1C1C24]"
                >
                  {/* Thumbnail */}
                  <Link
                    to={`/watch/${id}`}
                    className="relative w-full sm:w-60 md:w-72 aspect-video rounded-xl overflow-hidden bg-black shrink-0 block"
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

                    {/* Duration badge */}
                    {vid.videoFile?.duration > 0 && (
                      <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                        {formatDuration(vid.videoFile.duration)}
                      </span>
                    )}

                    {/* Play hover overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-[#FF3038] text-white flex items-center justify-center shadow-lg">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          to={`/watch/${id}`}
                          className="text-sm sm:text-base font-bold text-white line-clamp-2 group-hover:text-[#FF3038] transition-colors leading-snug"
                        >
                          {vid.title}
                        </Link>

                        <button
                          type="button"
                          onClick={(e) => handleRemoveItem(e, id)}
                          className="p-1.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                          title="Remove from history"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Creator info */}
                      <div className="flex items-center gap-2 mt-2">
                        <Link to={`/@${owner.username}`} className="hover:opacity-80 transition-opacity">
                          <Avatar
                            src={owner.avatar?.url || owner.avatar}
                            name={owner.displayName || owner.username}
                            size="xs"
                          />
                        </Link>
                        <Link
                          to={`/@${owner.username}`}
                          className="text-xs text-zinc-400 hover:text-white transition-colors truncate"
                        >
                          {owner.displayName || owner.username}
                        </Link>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-2">
                        <span>{formatViews(vid.views)}</span>
                        <span>•</span>
                        <span>Uploaded {formatTimeAgo(vid.createdAt)}</span>
                      </div>

                      {/* Description preview */}
                      {vid.description && (
                        <p className="text-xs text-zinc-500 line-clamp-1 mt-2 hidden sm:block">
                          {vid.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <Link to={`/watch/${id}`}>
                        <Button variant="secondary" size="sm" className="text-xs py-1 px-3">
                          Continue Watching
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load More Button */}
            {pagination.hasNext && (
              <div className="pt-6 flex justify-center">
                <Button
                  variant="outline"
                  size="md"
                  disabled={isLoadingMore}
                  onClick={handleLoadMore}
                  className="flex items-center gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    'Load More History'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─── Clear All Confirmation Modal ───────────────────── */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-[#17171D] border border-red-500/20 rounded-3xl p-6 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-white">Clear Watch History?</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Your StreamVibe watch history will be completely cleared from this account across all devices. This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isClearing}
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isClearing}
                  onClick={handleClearAll}
                  className="bg-red-500 hover:bg-red-600 border-red-500 flex items-center gap-2"
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    'Clear Watch History'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}