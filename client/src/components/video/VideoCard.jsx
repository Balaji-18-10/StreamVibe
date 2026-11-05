import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoreVertical, Clock, ListPlus, Share2, Check, Play } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import Badge from '../ui/Badge.jsx';
import SaveToPlaylistModal from '../playlist/SaveToPlaylistModal.jsx';
import { playlistService } from '../../services/index.js';
import { formatViews, formatDuration, formatTimeAgo, optimizeCloudinaryUrl } from '../../utils/formatters.js';

export default function VideoCard({ video, className = '' }) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedToWatchLater, setSavedToWatchLater] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  if (!video) return null;

  const id = video._id || video.id;
  const title = video.title || 'Untitled Video';
  const duration = video.videoFile?.duration || video.duration || 0;
  const views = video.views || 0;
  const createdAt = video.createdAt;
  const channel = video.owner || video.channel || {};
  const channelName = channel.displayName || channel.username || 'Creator';
  const channelUsername = channel.username || 'channel';
  const channelAvatar = channel.avatar?.url || channel.avatar || '';

  const rawThumbnail =
    !imageError && (video.thumbnail?.url || video.thumbnail)
      ? video.thumbnail?.url || video.thumbnail
      : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';

  const thumbnailUrl = optimizeCloudinaryUrl(rawThumbnail, { width: 640 });

  const handleCopyLink = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/watch/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setMenuOpen(false);
    }, 1500);
  };

  const handleMenuToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  };

  return (
    <div className={`group flex flex-col gap-3 w-full select-none cursor-pointer ${className}`}>
      {/* ─── Thumbnail Container ───────────────────────────────── */}
      <div
        onClick={() => navigate(`/watch/${id}`)}
        className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#17171D] border border-white/5 shadow-md shadow-black/40 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-black/70 group-hover:border-[#FF3038]/30"
      >
        <img
          src={thumbnailUrl}
          alt={title}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />

        {/* Subtle dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#FF3038]/90 text-white flex items-center justify-center shadow-lg shadow-[#FF3038]/30 transform scale-90 group-hover:scale-100 transition-all duration-300">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Duration badge */}
        {duration > 0 && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="duration">{formatDuration(duration)}</Badge>
          </div>
        )}
      </div>

      {/* ─── Video Information Row ─────────────────────────────── */}
      <div className="flex gap-3 px-0.5">
        {/* Channel Avatar */}
        <Link
          to={`/@${channelUsername}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 pt-0.5 group/avatar"
        >
          <Avatar
            src={channelAvatar}
            alt={channelName}
            name={channelName}
            size="sm"
            className="ring-1 ring-white/10 group-hover/avatar:ring-[#FF3038]/50 transition-all"
          />
        </Link>

        {/* Video Details */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Title */}
          <Link
            to={`/watch/${id}`}
            className="text-sm font-semibold text-white/95 line-clamp-2 leading-snug group-hover:text-[#FF3038] transition-colors duration-200"
            title={title}
          >
            {title}
          </Link>

          {/* Channel Name */}
          <Link
            to={`/@${channelUsername}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-medium text-[#A1A1AA] hover:text-white mt-1.5 truncate inline-block transition-colors"
          >
            {channelName}
          </Link>

          {/* Metadata */}
          <div className="flex items-center text-xs text-zinc-500 gap-1.5 mt-0.5">
            <span>{formatViews(views)}</span>
            <span className="text-[10px]">•</span>
            <span>{formatTimeAgo(createdAt)}</span>
          </div>
        </div>

        {/* Context Menu Button */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={handleMenuToggle}
            className="p-1 rounded-full text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Video options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 w-48 bg-[#17171D] border border-[#23232C] rounded-2xl p-1.5 shadow-2xl shadow-black/80 z-20 animate-fade-in backdrop-blur-md">
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  try {
                    await playlistService.addToWatchLater(id);
                    setSavedToWatchLater(true);
                    setTimeout(() => setSavedToWatchLater(false), 2000);
                  } catch (err) {
                    console.warn(err);
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left"
              >
                {savedToWatchLater ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Saved to Watch Later!</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Save to Watch Later</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setIsSaveModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left"
              >
                <ListPlus className="w-3.5 h-3.5 text-zinc-400" />
                <span>Save to Playlist</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Share Video</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <SaveToPlaylistModal
        video={video}
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />
    </div>
  );
}
