import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ListVideo, Play, Lock, Globe, EyeOff } from 'lucide-react';
import Badge from '../ui/Badge.jsx';

export default function ChannelPlaylistCard({ playlist, isOwner = false }) {
  const [imageError, setImageError] = useState(false);

  if (!playlist) return null;

  const id = playlist._id || playlist.id;
  const name = playlist.name || 'Untitled Playlist';
  const videoCount = playlist.videos?.length || 0;

  // Determine thumbnail from playlist or its first video
  const firstVideo = playlist.videos?.[0]?.video || playlist.videos?.[0];
  const firstVideoThumb = firstVideo?.thumbnail?.url || firstVideo?.thumbnail;
  const defaultThumbnail =
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';
  const thumbnailUrl =
    !imageError && (playlist.thumbnail || firstVideoThumb)
      ? playlist.thumbnail || firstVideoThumb
      : defaultThumbnail;

  return (
    <Link
      to={`/playlists/${id}`}
      className="group/playlist flex flex-col gap-2.5 w-full select-none cursor-pointer"
    >
      {/* ─── 16:9 Thumbnail with Playlist Bar ──────────────────── */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#17171D] border border-white/5 shadow-md shadow-black/40 transition-all duration-300 group-hover/playlist:shadow-xl group-hover/playlist:shadow-black/70 group-hover/playlist:border-[#FF3038]/30">
        <img
          src={thumbnailUrl}
          alt={name}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/playlist:scale-105"
        />

        {/* Right side translucent playlist count bar */}
        <div className="absolute inset-y-0 right-0 w-28 sm:w-32 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-1.5 text-white border-l border-white/10 transition-colors group-hover/playlist:bg-black/90">
          <ListVideo className="w-6 h-6 text-[#FF3038]" />
          <span className="text-xs font-bold">{videoCount}</span>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
            {videoCount === 1 ? 'Video' : 'Videos'}
          </span>
        </div>

        {/* Hover play icon overlay on main thumbnail area */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/playlist:opacity-100 transition-opacity duration-300 flex items-center justify-center pr-28 sm:pr-32">
          <div className="w-11 h-11 rounded-full bg-[#FF3038] text-white flex items-center justify-center shadow-lg shadow-[#FF3038]/40 transform scale-90 group-hover/playlist:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Visibility badge if owner */}
        {isOwner && playlist.visibility && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-semibold text-white flex items-center gap-1">
            {playlist.visibility === 'private' ? (
              <>
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Private</span>
              </>
            ) : playlist.visibility === 'unlisted' ? (
              <>
                <EyeOff className="w-3 h-3 text-zinc-400" />
                <span>Unlisted</span>
              </>
            ) : (
              <>
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>Public</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── Details ───────────────────────────────────────────── */}
      <div className="px-0.5">
        <h4 className="text-sm font-bold text-white group-hover/playlist:text-[#FF3038] line-clamp-2 leading-snug transition-colors mb-1">
          {name}
        </h4>
        <p className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors">
          View full playlist
        </p>
      </div>
    </Link>
  );
}
