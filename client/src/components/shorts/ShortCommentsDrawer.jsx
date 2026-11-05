import React, { useState, useEffect, useCallback } from 'react';
import { X, Send, Loader2, ThumbsUp } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import Button from '../ui/Button.jsx';
import { formatTimeAgo } from '../../utils/formatters.js';
import { commentService, likeService } from '../../services/index.js';
import { useAuthStore } from '../../store/authStore.js';

export default function ShortCommentsDrawer({
  isOpen,
  onClose,
  videoId,
  totalComments = 0,
}) {
  const { user, isAuthenticated } = useAuthStore();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadComments = useCallback(async () => {
    if (!videoId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await commentService.getByVideo(videoId, { sort: 'top', limit: 30 });
      if (res.data?.success) {
        setComments(res.data.data?.comments || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, loadComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    if (!isAuthenticated) {
      alert('Please sign in to comment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await commentService.add(videoId, { content: newComment.trim() });
      if (res.data?.success) {
        setComments((prev) => [res.data.data.comment, ...prev]);
        setNewComment('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!isAuthenticated) {
      alert('Please sign in to react.');
      return;
    }
    try {
      const res = await likeService.toggle('comment', commentId, 'like');
      if (res.data?.success) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === commentId
              ? {
                  ...c,
                  likeCount: res.data.data.likeCount,
                  userLiked: res.data.data.liked,
                }
              : c
          )
        );
      }
    } catch (err) {
      console.warn('Comment like error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container (bottom on mobile, side panel on desktop) */}
      <div className="w-full sm:w-[420px] max-w-full h-[70vh] sm:h-full bg-[#17171D] border-t sm:border-t-0 sm:border-l border-[#23232C] rounded-t-3xl sm:rounded-none flex flex-col z-10 shadow-2xl shadow-black animate-slide-up sm:animate-slide-down">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Comments</h3>
            <span className="text-xs text-zinc-400">
              ({comments.length || totalComments})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments Feed */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#FF3038] animate-spin" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-xs text-red-400">{error}</div>
          ) : comments.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              No comments yet. Start the conversation!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment._id} className="flex gap-3 text-xs">
                <Avatar
                  src={comment.author?.avatar?.url || comment.author?.avatar}
                  name={comment.author?.displayName || comment.author?.username}
                  size="sm"
                />
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white truncate">
                      {comment.author?.displayName || comment.author?.username}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {formatTimeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-zinc-200 leading-relaxed break-words">
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleLikeComment(comment._id)}
                      className={`flex items-center gap-1 text-[11px] transition-colors ${
                        comment.userLiked
                          ? 'text-[#FF3038] font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{comment.likeCount > 0 && comment.likeCount}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-white/5 bg-[#121217]">
          {isAuthenticated ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Avatar
                src={user?.avatar?.url || user?.avatar}
                name={user?.displayName || user?.username}
                size="sm"
              />
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-[#17171D] border border-[#23232C] text-white placeholder-zinc-500 text-xs rounded-xl py-2.5 px-3 outline-none focus:border-[#FF3038]"
              />
              <Button
                variant="primary"
                size="xs"
                type="submit"
                isLoading={isSubmitting}
                disabled={!newComment.trim()}
                className="rounded-xl px-3"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          ) : (
            <div className="text-center py-2 text-xs text-zinc-400">
              <a href="/login" className="text-[#FF3038] font-bold hover:underline">
                Sign in
              </a>{' '}
              to leave a comment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
