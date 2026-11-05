import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ListVideo,
  Play,
  MoreVertical,
  Globe,
  Lock,
  EyeOff,
  Edit,
  Trash2,
  Share2,
  Check,
} from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import { formatTimeAgo } from '../../utils/formatters.js';

export default function PlaylistCard({
  playlist,
  isOwner = false,
  onEdit,
  onDelete,
  className = '',
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

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

  if (!playlist) return null;

  const id = playlist._id;
  const name = playlist.name || 'Untitled Playlist';
  const videoCount = playlist.videoCount ?? (playlist.videos?.length || 0);
  const visibility = playlist.visibility || 'public';
  const isSystem = Boolean(playlist.isSystem);

  // Derive thumbnail
  const thumbnailUrl =
    playlist.thumbnail ||
    playlist.videos?.[0]?.video?.thumbnail?.url ||
    playlist.videos?.[0]?.video?.thumbnail ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';

  const handleCopyLink = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/playlists/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setMenuOpen(false);
    }, 1500);
  };

  const handleCardClick = () => {
    navigate(`/playlists/${id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group flex flex-col gap-3 w-full select-none cursor-pointer ${className}`}
    >
      {/* ─── Stacked Thumbnail Container ───────────────────────── */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#17171D] border border-white/5 shadow-md shadow-black/40 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-black/70 group-hover:border-[#FF3038]/30">
        <img
          src={thumbnailUrl}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />

        {/* Stacked Playlist Overlay Badge (Right side banner like YouTube) */}
        <div className="absolute inset-y-0 right-0 w-2/5 sm:w-1/3 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 text-white transition-colors group-hover:bg-black/85 border-l border-white/10">
          <ListVideo className="w-5 h-5 text-white" />
          <span className="text-xs font-bold font-mono">
            {videoCount}
          </span>
          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
            {videoCount === 1 ? 'video' : 'videos'}
          </span>
        </div>

        {/* Hover "Play All" button overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-[#FF3038] text-white text-xs font-bold px-3.5 py-2 rounded-full shadow-lg shadow-[#FF3038]/30 transform scale-90 group-hover:scale-100 transition-all">
            <Play className="w-3.5 h-3.5 fill-white" />
            Play All
          </div>
        </div>
      </div>

      {/* ─── Information Row ──────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          <h3
            className="text-sm font-semibold text-white/95 line-clamp-1 leading-snug group-hover:text-[#FF3038] transition-colors"
            title={name}
          >
            {name}
          </h3>

          <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1 flex-wrap">
            {visibility === 'public' && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Globe className="w-3 h-3" /> Public
              </span>
            )}
            {visibility === 'unlisted' && (
              <span className="flex items-center gap-1 text-amber-400">
                <EyeOff className="w-3 h-3" /> Unlisted
              </span>
            )}
            {visibility === 'private' && (
              <span className="flex items-center gap-1 text-zinc-400">
                <Lock className="w-3 h-3" /> Private
              </span>
            )}

            <span>•</span>
            <span>{formatTimeAgo(playlist.updatedAt || playlist.createdAt)}</span>
          </div>
        </div>

        {/* Context Menu Button */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Playlist options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-8 w-44 bg-[#17171D] border border-[#23232C] rounded-2xl p-1.5 shadow-2xl shadow-black/80 z-20 animate-fade-in backdrop-blur-md"
            >
              {isOwner && !isSystem && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit?.(playlist);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left"
                  >
                    <Edit className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Edit Playlist</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete?.(playlist);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Delete Playlist</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Share Playlist</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}