import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Music2,
  Plus,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import Button from '../ui/Button.jsx';
import ShortCommentsDrawer from './ShortCommentsDrawer.jsx';
import { formatViews } from '../../utils/formatters.js';
import { likeService, subscriptionService, videoService } from '../../services/index.js';
import { useAuthStore } from '../../store/authStore.js';

export default function ShortCard({
  short,
  isActive = false,
  isMuted = true,
  onToggleMute,
}) {
  const { user, isAuthenticated } = useAuthStore();
  const videoRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playIconVisible, setPlayIconVisible] = useState(false);

  // Social states
  const [likes, setLikes] = useState(short.likeCount || 0);
  const [dislikes, setDislikes] = useState(short.dislikeCount || 0);
  const [userReaction, setUserReaction] = useState(null); // 'like' | 'dislike' | null
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);

  // View recording tracker
  const viewRecordedRef = useRef(false);

  const creator = short.owner || {};
  const isOwner = user?._id && String(user._id) === String(creator._id);

  // ─── 1. Autoplay / Pause when active/inactive ────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = isMuted;
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          // Safely record view once
          if (!viewRecordedRef.current) {
            viewRecordedRef.current = true;
            videoService.incrementView(short._id).catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('Short autoplay prevented:', err);
          setIsPlaying(false);
        });
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive, isMuted, short._id]);

  // Synchronize mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Pause when browser tab/window is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        video.pause();
        setIsPlaying(false);
      } else if (isActive) {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive]);

  // ─── 2. Fetch User Reaction & Sub Status ────────────────────
  useEffect(() => {
    if (!isAuthenticated || !short._id) return;

    likeService
      .getStatus('video', short._id)
      .then((res) => {
        if (res.data?.success) {
          const isLiked = res.data.data.liked ?? res.data.data.isLiked;
          const isDisliked = res.data.data.disliked ?? res.data.data.isDisliked;
          setUserReaction(isLiked ? 'like' : isDisliked ? 'dislike' : null);
          if (typeof res.data.data.likeCount === 'number') {
            setLikes(res.data.data.likeCount);
          }
        }
      })
      .catch(() => {});

    if (creator._id) {
      subscriptionService
        .getStatus(creator._id)
        .then((res) => {
          if (res.data?.success) {
            setIsSubscribed(Boolean(res.data.data.subscribed ?? res.data.data.isSubscribed));
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, short._id, creator._id]);

  // ─── 3. Toggle Play / Pause on click ────────────────────────
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || hasError) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }

    setPlayIconVisible(true);
    setTimeout(() => setPlayIconVisible(false), 600);
  };

  // ─── 4. Like / Dislike ──────────────────────────────────────
  const handleLike = async (type) => {
    if (!isAuthenticated) {
      alert('Please sign in to react.');
      return;
    }
    try {
      const res = await likeService.toggle('video', short._id, type);
      if (res.data?.success) {
        const isLiked = res.data.data.liked ?? res.data.data.isLiked;
        const isDisliked = res.data.data.disliked ?? res.data.data.isDisliked;
        setUserReaction(isLiked ? 'like' : isDisliked ? 'dislike' : null);
        setLikes(res.data.data.likeCount);
        setDislikes(res.data.data.dislikeCount);
      }
    } catch (err) {
      console.warn('Short reaction error:', err);
    }
  };

  // ─── 5. Subscribe / Unsubscribe ─────────────────────────────
  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to subscribe.');
      return;
    }
    if (!creator._id || isOwner) return;

    try {
      const res = await subscriptionService.toggle(creator._id);
      if (res.data?.success) {
        setIsSubscribed(Boolean(res.data.data.subscribed ?? res.data.data.isSubscribed));
      }
    } catch (err) {
      console.warn('Short subscribe error:', err);
    }
  };

  // ─── 6. Share ───────────────────────────────────────────────
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/shorts/${short._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: short.title,
          text: `Check out this Short on StreamVibe: ${short.title}`,
          url: shareUrl,
        });
      } catch {
        // Fallback to clipboard if share cancelled
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  // ─── Video HTML5 Listeners ─────────────────────────────────
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center snap-start snap-always py-2 sm:py-4">
      {/* ─── 9:16 Vertical Video Frame ─────────────────────────── */}
      <div className="relative w-full max-w-[420px] h-full max-h-[820px] aspect-[9/16] bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black border border-white/5 flex items-center justify-center">
        {/* Native Video */}
        {(short.videoFile?.url || short.videoUrl) ? (
          <video
            ref={videoRef}
            src={short.videoFile?.url || short.videoUrl}
            poster={short.thumbnail?.url || short.thumbnail}
            loop
            playsInline
            preload="auto"
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onError={() => {
              setHasError(true);
              setIsBuffering(false);
            }}
            className="w-full h-full object-cover cursor-pointer select-none"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500">
            <AlertCircle className="w-10 h-10 mb-2" />
            <p className="text-xs">Short media is unavailable.</p>
          </div>
        )}

        {/* Buffering Indicator */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <Loader2 className="w-10 h-10 text-[#FF3038] animate-spin" />
          </div>
        )}

        {/* Brief Center Play/Pause Flash Icon */}
        {playIconVisible && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center">
              {isPlaying ? <Play className="w-8 h-8 fill-white ml-1" /> : <Pause className="w-8 h-8" />}
            </div>
          </div>
        )}

        {/* Floating Mute/Unmute Pill */}
        <button
          type="button"
          onClick={onToggleMute}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-all z-20"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-[#FF3038]" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* ─── Bottom Metadata Overlay ─────────────────────────── */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-4 pb-3 flex flex-col gap-2 z-10 pointer-events-none">
          {/* Creator Info */}
          <div className="flex items-center gap-2.5 pointer-events-auto">
            <Link to={`/@${creator.username}`}>
              <Avatar
                src={creator.avatar?.url || creator.avatar}
                name={creator.displayName || creator.username}
                size="sm"
                border
              />
            </Link>

            <Link
              to={`/@${creator.username}`}
              className="text-xs font-bold text-white hover:text-[#FF3038] transition-colors truncate max-w-[140px]"
            >
              @{creator.username}
            </Link>

            {/* Subscribe Button */}
            {!isOwner && (
              <button
                type="button"
                onClick={handleSubscribe}
                className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all ${
                  isSubscribed
                    ? 'bg-white/20 text-white'
                    : 'bg-[#FF3038] text-white hover:bg-[#E0222A] shadow-md shadow-[#FF3038]/30'
                }`}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            )}
          </div>

          {/* Title & Description */}
          <div className="pointer-events-auto">
            <p
              onClick={() => setTitleExpanded((prev) => !prev)}
              className={`text-xs text-white/95 leading-relaxed cursor-pointer ${
                titleExpanded ? '' : 'line-clamp-2'
              }`}
            >
              {short.title}
            </p>
          </div>

          {/* Sound / Music tag */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
            <Music2 className="w-3.5 h-3.5 text-[#FF3038] shrink-0" />
            <span className="truncate">Original Audio — {creator.displayName || creator.username}</span>
          </div>

          {/* Scrubber Progress Line */}
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-[#FF3038] transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ─── Right-side Floating Action Controls ─────────────── */}
        <div className="absolute right-3 bottom-14 flex flex-col items-center gap-4 z-20 select-none">
          {/* Like */}
          <button
            type="button"
            onClick={() => handleLike('like')}
            className="flex flex-col items-center gap-1 group/btn"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                userReaction === 'like'
                  ? 'bg-[#FF3038] text-white shadow-lg shadow-[#FF3038]/40 scale-105'
                  : 'bg-black/60 backdrop-blur-md text-white hover:bg-black/80'
              }`}
            >
              <ThumbsUp className={`w-5 h-5 ${userReaction === 'like' ? 'fill-white' : ''}`} />
            </div>
            <span className="text-[11px] font-bold text-white drop-shadow">
              {formatViews(likes).replace(' views', '')}
            </span>
          </button>

          {/* Dislike */}
          <button
            type="button"
            onClick={() => handleLike('dislike')}
            className="flex flex-col items-center gap-1 group/btn"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                userReaction === 'dislike'
                  ? 'bg-[#FF3038] text-white shadow-lg shadow-[#FF3038]/40 scale-105'
                  : 'bg-black/60 backdrop-blur-md text-white hover:bg-black/80'
              }`}
            >
              <ThumbsDown
                className={`w-5 h-5 ${userReaction === 'dislike' ? 'fill-white' : ''}`}
              />
            </div>
            <span className="text-[10px] font-medium text-zinc-300 drop-shadow">Dislike</span>
          </button>

          {/* Comments */}
          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="flex flex-col items-center gap-1 group/btn"
          >
            <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 flex items-center justify-center transition-all">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-white drop-shadow">
              {short.commentCount || 0}
            </span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="flex flex-col items-center gap-1 group/btn"
          >
            <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 flex items-center justify-center transition-all">
              {shareCopied ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </div>
            <span className="text-[10px] font-medium text-zinc-300 drop-shadow">
              {shareCopied ? 'Copied' : 'Share'}
            </span>
          </button>
        </div>
      </div>

      {/* ─── Comments Slide Drawer Overlay ─────────────────────── */}
      <ShortCommentsDrawer
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        videoId={short._id}
        totalComments={short.commentCount || 0}
      />
    </div>
  );
}
