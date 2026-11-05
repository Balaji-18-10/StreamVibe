import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  Bell,
  Check,
  Eye,
  Calendar,
  Sparkles,
  AlertCircle,
  Loader2,
  ListPlus,
  MessageSquare,
  Flag,
} from 'lucide-react';
import CustomVideoPlayer from '../components/video/CustomVideoPlayer.jsx';
import CommentsSection from '../components/video/CommentsSection.jsx';
import LiveChat from '../components/chat/LiveChat.jsx';
import VideoCard from '../components/video/VideoCard.jsx';
import SaveToPlaylistModal from '../components/playlist/SaveToPlaylistModal.jsx';
import ReportModal from '../components/video/ReportModal.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import { formatViews, formatTimeAgo } from '../utils/formatters.js';
import { videoService, likeService, subscriptionService } from '../services/index.js';
import { useAuthStore } from '../store/authStore.js';

export default function Watch() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [video, setVideo] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Description expansion
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Likes & Dislikes state
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [reactionState, setReactionState] = useState({ isLiked: false, isDisliked: false });
  const [isLiking, setIsLiking] = useState(false);

  // Subscription state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Share state
  const [copied, setCopied] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Live Chat state
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Ref to prevent duplicate view increments on React re-renders
  const viewIncrementedVideoIdRef = useRef(null);

  // ─── 1. Fetch Video Details & Recommendations ───────────────
  const fetchVideoDetails = useCallback(async () => {
    if (!videoId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch for video details and recommendations
      const [videoRes, recRes] = await Promise.all([
        videoService.getById(videoId),
        videoService.getRecommended(videoId).catch(() => ({ data: { data: { videos: [] } } })),
      ]);

      if (videoRes.data?.success) {
        const v = videoRes.data.data.video;
        setVideo(v);
        setLikeCount(v.likeCount || 0);
        setDislikeCount(v.dislikeCount || 0);
        setSubscriberCount(v.owner?.subscriberCount || 0);

        setRecommended(recRes.data?.data?.videos || []);
      } else {
        throw new Error('Video not found');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load video');
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  // ─── 2. Fetch User Reaction & Subscription Status ──────────
  const fetchUserSocialStatus = useCallback(async () => {
    if (!isAuthenticated || !videoId) return;

    try {
      const likeRes = await likeService.getStatus('video', videoId);
      if (likeRes.data?.success) {
        const isLiked = Boolean(likeRes.data.data.liked ?? likeRes.data.data.isLiked);
        const isDisliked = Boolean(likeRes.data.data.disliked ?? likeRes.data.data.isDisliked);
        setReactionState({ isLiked, isDisliked });
        if (typeof likeRes.data.data.likeCount === 'number') {
          setLikeCount(likeRes.data.data.likeCount);
        }
        if (typeof likeRes.data.data.dislikeCount === 'number') {
          setDislikeCount(likeRes.data.data.dislikeCount);
        }
      }
    } catch {
      // Ignored for guests / unauthenticated
    }
  }, [isAuthenticated, videoId]);

  const fetchChannelSubStatus = useCallback(async (ownerId) => {
    if (!isAuthenticated || !ownerId) return;
    try {
      const subRes = await subscriptionService.getStatus(ownerId);
      if (subRes.data?.success) {
        setIsSubscribed(Boolean(subRes.data.data.subscribed ?? subRes.data.data.isSubscribed));
      }
    } catch {
      // Ignored for unauthenticated
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchVideoDetails();
  }, [fetchVideoDetails]);

  useEffect(() => {
    fetchUserSocialStatus();
  }, [fetchUserSocialStatus]);

  useEffect(() => {
    if (video?.owner?._id) {
      fetchChannelSubStatus(video.owner._id);
    }
  }, [video?.owner?._id, fetchChannelSubStatus]);

  // ─── 3. Safe Single View Increment ─────────────────────────
  const handleRecordView = useCallback(() => {
    if (viewIncrementedVideoIdRef.current === videoId) return;
    viewIncrementedVideoIdRef.current = videoId;

    videoService
      .incrementView(videoId)
      .then(() => {
        setVideo((prev) => (prev ? { ...prev, views: (prev.views || 0) + 1 } : prev));
      })
      .catch((err) => {
        console.warn('View increment notice:', err.message);
      });
  }, [videoId]);

  // ─── 4. Like / Dislike Handlers ─────────────────────────────
  const handleToggleReaction = async (type) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    try {
      const res = await likeService.toggle('video', videoId, type);
      if (res.data?.success) {
        const isLiked = Boolean(res.data.data.liked ?? res.data.data.isLiked);
        const isDisliked = Boolean(res.data.data.disliked ?? res.data.data.isDisliked);
        const newLikes = res.data.data.likeCount;
        const newDislikes = res.data.data.dislikeCount;
        setReactionState({ isLiked, isDisliked });
        setLikeCount(newLikes);
        setDislikeCount(newDislikes);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update reaction.');
    } finally {
      setIsLiking(false);
    }
  };

  // ─── 5. Subscribe / Unsubscribe Handler ────────────────────
  const handleToggleSubscribe = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!video?.owner?._id || isSubscribing) return;

    if (user?._id && String(user._id) === String(video.owner._id)) {
      alert('You cannot subscribe to your own channel.');
      return;
    }

    setIsSubscribing(true);
    try {
      const res = await subscriptionService.toggle(video.owner._id);
      if (res.data?.success) {
        const newSubStatus = Boolean(res.data.data.subscribed ?? res.data.data.isSubscribed);
        const newCount = res.data.data.subscriberCount;
        setIsSubscribed(newSubStatus);
        setSubscriberCount(newCount);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update subscription.');
    } finally {
      setIsSubscribing(false);
    }
  };

  // ─── 6. Share Link Copy Handler ─────────────────────────────
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-[#FF3038] animate-spin" />
        <p className="text-xs text-[#A1A1AA] font-medium">Loading video player...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="py-16">
        <ErrorState
          title="Video Unavailable"
          message={error || 'This video could not be found or has been removed.'}
          onRetry={fetchVideoDetails}
        />
      </div>
    );
  }

  const owner = video.owner || {};
  const isOwner = user?._id && String(user._id) === String(owner._id);

  return (
    <div className="w-full max-w-[1920px] mx-auto flex flex-col lg:flex-row gap-6 xl:gap-8">
      {/* ─── Left Column: Player, Video Info, Creator, Comments ──── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* 1. Custom Video Player */}
        <CustomVideoPlayer
          url={video.videoFile?.url}
          thumbnail={video.thumbnail?.url || video.thumbnail}
          title={video.title}
          onPlay={handleRecordView}
        />

        {/* 2. Video Title */}
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
          {video.title}
        </h1>

        {/* 3. Creator Bar & Social Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
          {/* Creator Profile */}
          <div className="flex items-center gap-3">
            <Link to={`/@${owner.username}`} className="group">
              <Avatar
                src={owner.avatar?.url || owner.avatar}
                name={owner.displayName || owner.username}
                size="md"
                border
              />
            </Link>

            <div className="flex flex-col">
              <Link
                to={`/@${owner.username}`}
                className="text-sm font-bold text-white hover:text-[#FF3038] transition-colors truncate max-w-[200px]"
              >
                {owner.displayName || owner.username}
              </Link>
              <span className="text-xs text-zinc-500">
                {subscriberCount} {subscriberCount === 1 ? 'subscriber' : 'subscribers'}
              </span>
            </div>

            {/* Subscribe Button */}
            {!isOwner && (
              <Button
                variant={isSubscribed ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleToggleSubscribe}
                isLoading={isSubscribing}
                className="ml-2 rounded-full font-bold px-5"
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
            )}
          </div>

          {/* Social Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Like / Dislike Pill */}
            <div className="flex items-center bg-[#17171D] border border-[#23232C] rounded-full overflow-hidden">
              <button
                type="button"
                onClick={() => handleToggleReaction('like')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold hover:bg-white/5 transition-colors cursor-pointer ${
                  reactionState.isLiked ? 'text-[#FF3038]' : 'text-zinc-300'
                }`}
                title="I like this"
              >
                <ThumbsUp className={`w-4 h-4 ${reactionState.isLiked ? 'fill-current' : ''}`} />
                <span>{likeCount}</span>
              </button>
              <div className="w-[1px] h-5 bg-[#23232C]" />
              <button
                type="button"
                onClick={() => handleToggleReaction('dislike')}
                className={`px-3.5 py-2 text-xs hover:bg-white/5 transition-colors cursor-pointer ${
                  reactionState.isDisliked ? 'text-[#FF3038]' : 'text-zinc-400 hover:text-white'
                }`}
                title="I dislike this"
              >
                <ThumbsDown className={`w-4 h-4 ${reactionState.isDisliked ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Share Button */}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={copied ? Check : Share2}
              onClick={handleShare}
              className="rounded-full"
            >
              {copied ? 'Copied!' : 'Share'}
            </Button>

            {/* Save to Playlist / Watch Later */}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={ListPlus}
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/login?redirect=/watch/' + videoId);
                  return;
                }
                setIsSaveModalOpen(true);
              }}
              className="rounded-full"
            >
              Save
            </Button>

            {/* Report Video Button */}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Flag}
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/login?redirect=/watch/' + videoId);
                  return;
                }
                setIsReportModalOpen(true);
              }}
              className="rounded-full text-zinc-400 hover:text-red-400"
              title="Report this video"
            >
              Report
            </Button>

            {/* Live Chat Toggle Button */}
            <Button
              variant={isChatOpen ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={MessageSquare}
              onClick={() => setIsChatOpen((prev) => !prev)}
              className="rounded-full"
              title={isChatOpen ? 'Hide Live Chat' : 'Show Live Chat'}
            >
              {isChatOpen ? 'Chat' : 'Show Chat'}
            </Button>
          </div>
        </div>

        {/* 4. Description & Metadata Box */}
        <div className="p-4 rounded-2xl bg-[#17171D] border border-[#23232C] flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-zinc-300">
            <span>{formatViews(video.views)}</span>
            <span>•</span>
            <span>{formatTimeAgo(video.createdAt)}</span>
            {video.category && (
              <>
                <span>•</span>
                <Badge variant="accent">{video.category}</Badge>
              </>
            )}
          </div>

          {/* Description Text */}
          <div className="text-xs sm:text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
            {video.description ? (
              descriptionExpanded ? (
                video.description
              ) : (
                <span className="line-clamp-3">{video.description}</span>
              )
            ) : (
              <span className="text-zinc-500 italic">No description provided.</span>
            )}
          </div>

          {video.description && video.description.length > 150 && (
            <button
              type="button"
              onClick={() => setDescriptionExpanded((prev) => !prev)}
              className="self-start text-xs font-bold text-white hover:text-[#FF3038] mt-1 transition-colors cursor-pointer"
            >
              {descriptionExpanded ? 'Show less' : '...Show more'}
            </button>
          )}

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
              {video.tags.map((tag, idx) => (
                <span key={idx} className="text-xs text-[#FF3038] hover:underline cursor-pointer">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Live Chat (visible on smaller screens when toggled open) */}
        <div className="block lg:hidden">
          <LiveChat
            videoId={video._id}
            videoOwnerId={owner._id}
            isOpen={isChatOpen}
            onToggleOpen={() => setIsChatOpen((prev) => !prev)}
          />
        </div>

        {/* 5. Comments Section */}
        <CommentsSection
          videoId={video._id}
          videoOwnerId={owner._id}
          totalComments={video.commentCount || 0}
        />
      </div>

      {/* ─── Right Column: Recommendations Sidebar ──────────────── */}
      <aside className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col gap-4">
        {/* Desktop Live Chat (visible on lg+ screens) */}
        <div className="hidden lg:block">
          <LiveChat
            videoId={video._id}
            videoOwnerId={owner._id}
            isOpen={isChatOpen}
            onToggleOpen={() => setIsChatOpen((prev) => !prev)}
          />
        </div>

        <div className="flex items-center gap-2 pb-1 border-b border-white/5">
          <Sparkles className="w-4 h-4 text-[#FF3038]" />
          <h3 className="text-sm font-bold text-white">Recommended Videos</h3>
        </div>

        {recommended.length > 0 ? (
          <div className="flex flex-col gap-4">
            {recommended.map((recVideo) => (
              <VideoCard key={recVideo._id} video={recVideo} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-zinc-500">
            No related videos found for this topic.
          </div>
        )}
      </aside>

      <SaveToPlaylistModal
        video={video}
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        entityType="Video"
        entityId={video._id}
        entityTitle={video.title}
      />
    </div>
  );
}
