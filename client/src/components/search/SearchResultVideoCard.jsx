import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Sparkles } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import Badge from '../ui/Badge.jsx';
import { formatViews, formatDuration, formatTimeAgo } from '../../utils/formatters.js';

export default function SearchResultVideoCard({ video }) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  if (!video) return null;

  const id = video._id || video.id;
  const title = video.title || 'Untitled Video';
  const duration = video.videoFile?.duration || video.duration || 0;
  const views = video.views || 0;
  const createdAt = video.createdAt;
  const channel = video.owner || {};
  const channelName = channel.displayName || channel.username || 'Creator';
  const channelUsername = channel.username || 'channel';
  const channelAvatar = channel.avatar?.url || channel.avatar || '';
  const description = video.description || '';
  const category = video.category;
  const tags = Array.isArray(video.tags) ? video.tags : [];

  const defaultThumbnail =
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';
  const thumbnailUrl = !imageError && (video.thumbnail?.url || video.thumbnail)
    ? video.thumbnail?.url || video.thumbnail
    : defaultThumbnail;

  return (
    <article className="group/card flex flex-col sm:flex-row gap-3.5 sm:gap-5 w-full p-2.5 sm:p-3 rounded-2xl bg-[#17171D]/40 hover:bg-[#17171D] border border-transparent hover:border-white/5 transition-all duration-200">
      {/* ─── 16:9 Thumbnail ──────────────────────────────────── */}
      <div
        onClick={() => navigate(`/watch/${id}`)}
        className="relative w-full sm:w-72 md:w-80 lg:w-96 shrink-0 aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black/60 border border-white/5 shadow-md shadow-black/40 cursor-pointer"
      >
        <img
          src={thumbnailUrl}
          alt={title}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.03]"
        />

        {/* Hover play icon overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#FF3038] text-white flex items-center justify-center shadow-lg shadow-[#FF3038]/40 transform scale-90 group-hover/card:scale-100 transition-transform duration-200">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Duration badge */}
        {duration > 0 && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="duration">{formatDuration(duration)}</Badge>
          </div>
        )}

        {/* Video type pill if Short */}
        {video.type === 'short' && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#FF3038] text-white text-[10px] font-bold tracking-wide uppercase shadow">
            Short
          </div>
        )}
      </div>

      {/* ─── Video Details ────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          {/* Title */}
          <Link
            to={`/watch/${id}`}
            className="block text-base sm:text-lg font-bold text-white group-hover/card:text-[#FF3038] line-clamp-2 leading-snug transition-colors mb-1.5"
            title={title}
          >
            {title}
          </Link>

          {/* Stats & Upload Date */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2.5">
            <span>{formatViews(views)}</span>
            <span>•</span>
            <span>{formatTimeAgo(createdAt)}</span>
          </div>

          {/* Channel Info */}
          <Link
            to={`/@${channelUsername}`}
            className="inline-flex items-center gap-2.5 group/author mb-3"
          >
            <Avatar
              src={channelAvatar}
              name={channelName}
              size="sm"
              className="group-hover/author:ring-2 group-hover/author:ring-[#FF3038] transition-all"
            />
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-semibold text-zinc-200 group-hover/author:text-white transition-colors truncate max-w-[200px] sm:max-w-[280px]">
                {channelName}
              </span>
              <span className="text-[11px] text-zinc-500">@{channelUsername}</span>
            </div>
          </Link>

          {/* Description Snippet */}
          {description && (
            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3">
              {description}
            </p>
          )}
        </div>

        {/* Category & Tags Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
          {category && category !== 'Other' && (
            <span className="px-2.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] font-medium transition-colors border border-white/5">
              {category}
            </span>
          )}

          {tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              #{tag.replace(/^#/, '')}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
