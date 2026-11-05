import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Eye, Flame } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import { formatViews, formatDuration } from '../../utils/formatters.js';

export default function ChannelShortCard({ short }) {
  const [imageError, setImageError] = useState(false);

  if (!short) return null;

  const id = short._id || short.id;
  const title = short.title || 'Untitled Short';
  const views = short.views || 0;
  const duration = short.videoFile?.duration || short.duration || 0;

  const defaultThumbnail =
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80';
  const thumbnailUrl =
    !imageError && (short.thumbnail?.url || short.thumbnail)
      ? short.thumbnail?.url || short.thumbnail
      : defaultThumbnail;

  return (
    <Link
      to={`/shorts/${id}`}
      className="group/short flex flex-col gap-2 w-full select-none cursor-pointer"
    >
      {/* ─── 9:16 Vertical Card ────────────────────────────────── */}
      <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-[#17171D] border border-white/5 shadow-md shadow-black/40 transition-all duration-300 group-hover/short:shadow-xl group-hover/short:shadow-black/70 group-hover/short:border-[#FF3038]/40">
        <img
          src={thumbnailUrl}
          alt={title}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/short:scale-105"
        />

        {/* Hover overlay with Play button */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/short:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-[#FF3038] text-white flex items-center justify-center shadow-lg shadow-[#FF3038]/40 transform scale-90 group-hover/short:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Top Short Pill */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold tracking-wider flex items-center gap-1">
          <Flame className="w-3 h-3 text-[#FF3038]" />
          <span>SHORT</span>
        </div>

        {/* Duration badge */}
        {duration > 0 && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="duration">{formatDuration(duration)}</Badge>
          </div>
        )}
      </div>

      {/* ─── Title & Views ─────────────────────────────────────── */}
      <div className="px-0.5">
        <h4 className="text-xs sm:text-sm font-semibold text-white group-hover/short:text-[#FF3038] line-clamp-2 leading-snug transition-colors mb-1">
          {title}
        </h4>
        <p className="text-[11px] text-zinc-400 font-medium">
          {formatViews(views)}
        </p>
      </div>
    </Link>
  );
}
