import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Pin,
  CornerDownRight,
  MoreVertical,
  Edit2,
  Trash2,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Flag,
} from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import Button from '../ui/Button.jsx';
import ReportModal from './ReportModal.jsx';
import { formatTimeAgo } from '../../utils/formatters.js';
import { commentService, likeService } from '../../services/index.js';
import { useAuthStore } from '../../store/authStore.js';

export default function CommentsSection({ videoId, videoOwnerId, totalComments = 0 }) {
  const { user, isAuthenticated } = useAuthStore();

  const [comments, setComments] = useState([]);
  const [sort, setSort] = useState('top');
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load comments
  const loadComments = useCallback(async () => {
    if (!videoId) return;
    setIsLoading(true);
    try {
      const res = await commentService.getByVideo(videoId, { sort, limit: 30 });
      if (res.data?.success) {
        setComments(res.data.data?.comments || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }, [videoId, sort]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Submit top-level comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await commentService.add(videoId, { content: newCommentText.trim() });
      if (res.data?.success) {
        const createdComment = res.data.data?.comment;
        setComments((prev) => [createdComment, ...prev]);
        setNewCommentText('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pt-4">
      {/* Header & Sort */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#FF3038]" />
          <h3 className="text-base font-bold text-white">
            <span>Comments</span>
            <span className="text-xs font-normal text-zinc-500 ml-2">
              ({comments.length || totalComments})
            </span>
          </h3>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSort('top')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              sort === 'top'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Top Comments
          </button>
          <button
            type="button"
            onClick={() => setSort('newest')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              sort === 'newest'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Newest First
          </button>
        </div>
      </div>

      {/* Add Comment Input Form */}
      {isAuthenticated ? (
        <form onSubmit={handleAddComment} className="flex items-start gap-3">
          <Avatar
            src={user?.avatar?.url || user?.avatar}
            name={user?.displayName || user?.username}
            size="md"
          />
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              rows={2}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment to this video..."
              className="w-full bg-[#17171D] border border-[#23232C] rounded-2xl p-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] transition-all resize-none"
            />
            {newCommentText.trim() && (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setNewCommentText('')}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="xs"
                  type="submit"
                  isLoading={isSubmitting}
                >
                  Comment
                </Button>
              </div>
            )}
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-2xl bg-[#17171D]/60 border border-[#23232C] text-center text-xs text-zinc-400">
          <span>Please </span>
          <a href="/login" className="text-[#FF3038] font-semibold hover:underline">
            sign in
          </a>
          <span> to participate in the conversation.</span>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#FF3038] animate-spin" />
        </div>
      ) : error ? (
        <div className="py-6 text-center text-xs text-red-400">{error}</div>
      ) : comments.length === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-500">
          No comments yet. Be the first to share your thoughts!
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              videoId={videoId}
              videoOwnerId={videoOwnerId}
              currentUserId={user?._id}
              onCommentDeleted={(id) =>
                setComments((prev) => prev.filter((c) => c._id !== id))
              }
              onCommentUpdated={(updated) =>
                setComments((prev) =>
                  prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c))
                )
              }
              onCommentPinned={(pinnedId, isPinned) =>
                setComments((prev) =>
                  prev.map((c) => ({
                    ...c,
                    isPinned: c._id === pinnedId ? isPinned : false,
                  }))
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Individual Comment Item Component ────────────────────────
function CommentItem({
  comment,
  videoId,
  videoOwnerId,
  currentUserId,
  onCommentDeleted,
  onCommentUpdated,
  onCommentPinned,
}) {
  const [replies, setReplies] = useState([]);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyInputOpen, setReplyInputOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Reaction state
  const [likes, setLikes] = useState(comment.likeCount || 0);
  const [dislikes, setDislikes] = useState(comment.dislikeCount || 0);
  const [myReaction, setMyReaction] = useState(null);

  const { user } = useAuthStore();
  const author = comment.author || {};
  const isAuthor = currentUserId && String(author._id) === String(currentUserId);
  const isVideoOwner = currentUserId && String(videoOwnerId) === String(currentUserId);
  const isAdmin = user?.role === 'admin';
  const canDelete = isAuthor || isVideoOwner || isAdmin;
  const canReport = Boolean(currentUserId && !isAuthor);
  const canShowMenu = canDelete || isAuthor || isVideoOwner || canReport;

  // Toggle Reactions
  const handleReaction = async (type) => {
    if (!currentUserId) {
      alert('Please sign in to react to comments.');
      return;
    }
    try {
      const res = await likeService.toggle('comment', comment._id, type);
      if (res.data?.success) {
        setLikes(res.data.data.likeCount);
        setDislikes(res.data.data.dislikeCount);
        const isLiked = Boolean(res.data.data.liked ?? res.data.data.isLiked);
        const isDisliked = Boolean(res.data.data.disliked ?? res.data.data.isDisliked);
        setMyReaction(isLiked ? 'like' : isDisliked ? 'dislike' : null);
      }
    } catch (err) {
      console.warn('Comment reaction error:', err.message);
    }
  };

  // Toggle Pin (Video owner only)
  const handlePin = async () => {
    try {
      const res = await commentService.pin(comment._id);
      if (res.data?.success) {
        onCommentPinned(comment._id, res.data.data.isPinned);
        setMenuOpen(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle pin');
    }
  };

  // Delete Comment
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await commentService.delete(comment._id);
      onCommentDeleted(comment._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  // Update Comment
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editText.trim()) return;
    try {
      const res = await commentService.update(comment._id, { content: editText.trim() });
      if (res.data?.success) {
        onCommentUpdated(res.data.data.comment);
        setIsEditing(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update comment');
    }
  };

  // Load Threaded Replies
  const toggleReplies = async () => {
    if (repliesOpen) {
      setRepliesOpen(false);
      return;
    }
    setRepliesOpen(true);
    if (replies.length === 0) {
      setLoadingReplies(true);
      try {
        const res = await commentService.getReplies(comment._id);
        if (res.data?.success) {
          setReplies(res.data.data.replies || []);
        }
      } catch (err) {
        console.warn('Failed to load replies:', err.message);
      } finally {
        setLoadingReplies(false);
      }
    }
  };

  // Submit Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmittingReply) return;
    setIsSubmittingReply(true);
    try {
      const res = await commentService.add(videoId, {
        content: replyText.trim(),
        parentCommentId: comment._id,
      });
      if (res.data?.success) {
        setReplies((prev) => [...prev, res.data.data.comment]);
        setReplyText('');
        setReplyInputOpen(false);
        setRepliesOpen(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className="flex gap-3 group/comment select-none">
      <Avatar
        src={author.avatar?.url || author.avatar}
        name={author.displayName || author.username}
        size="sm"
      />

      <div className="flex-1 flex flex-col gap-1">
        {/* Author Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-white">
              {author.displayName || author.username}
            </span>
            {String(videoOwnerId) === String(author._id) && (
              <span className="px-1.5 py-0.2 bg-[#FF3038]/20 text-[#FF3038] text-[10px] font-bold rounded">
                Creator
              </span>
            )}
            <span className="text-zinc-500 text-[11px]">{formatTimeAgo(comment.createdAt)}</span>
            {comment.isEdited && <span className="text-zinc-500 text-[10px]">(edited)</span>}
            {comment.isPinned && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#FF3038] bg-[#FF3038]/10 px-2 py-0.5 rounded-full">
                <Pin className="w-3 h-3 fill-current" />
                Pinned by creator
              </span>
            )}
          </div>

          {/* Action Menu */}
          {canShowMenu && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white opacity-0 group-hover/comment:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-6 w-38 bg-[#17171D] border border-[#23232C] rounded-xl p-1 shadow-xl z-20 flex flex-col gap-0.5 animate-fade-in">
                  {isVideoOwner && (
                    <button
                      type="button"
                      onClick={handlePin}
                      className="px-2.5 py-1.5 text-xs text-left font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2"
                    >
                      <Pin className="w-3 h-3 text-[#FF3038]" />
                      <span>{comment.isPinned ? 'Unpin' : 'Pin comment'}</span>
                    </button>
                  )}
                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setMenuOpen(false);
                      }}
                      className="px-2.5 py-1.5 text-xs text-left font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2"
                    >
                      <Edit2 className="w-3 h-3 text-zinc-400" />
                      <span>Edit</span>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleDelete();
                      }}
                      className="px-2.5 py-1.5 text-xs text-left font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                  {canReport && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setIsReportModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 text-xs text-left font-medium text-zinc-400 hover:text-red-400 hover:bg-white/10 rounded-lg flex items-center gap-2"
                    >
                      <Flag className="w-3 h-3" />
                      <span>Report</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comment Report Modal */}
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          entityType="Comment"
          entityId={comment._id}
          entityTitle={comment.content?.slice(0, 50)}
        />

        {/* Comment Body / Edit input */}
        {isEditing ? (
          <form onSubmit={handleUpdate} className="flex flex-col gap-2 mt-1">
            <textarea
              rows={2}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-[#17171D] border border-[#23232C] rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#FF3038]"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="xs" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="xs" type="submit">
                Save
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-zinc-200 leading-relaxed break-words">{comment.content}</p>
        )}

        {/* Reaction and Reply Bar */}
        <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1">
          {/* Like */}
          <button
            type="button"
            onClick={() => handleReaction('like')}
            className={`flex items-center gap-1.5 hover:text-white transition-colors ${
              myReaction === 'like' ? 'text-[#FF3038] font-bold' : ''
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{likes > 0 && likes}</span>
          </button>

          {/* Dislike */}
          <button
            type="button"
            onClick={() => handleReaction('dislike')}
            className={`flex items-center gap-1.5 hover:text-white transition-colors ${
              myReaction === 'dislike' ? 'text-[#FF3038] font-bold' : ''
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>

          {/* Reply trigger */}
          {currentUserId && (
            <button
              type="button"
              onClick={() => setReplyInputOpen((prev) => !prev)}
              className="hover:text-white transition-colors font-medium text-[11px]"
            >
              Reply
            </button>
          )}
        </div>

        {/* Inline Reply Input */}
        {replyInputOpen && (
          <form onSubmit={handleSendReply} className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 bg-[#17171D] border border-[#23232C] rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#FF3038]"
            />
            <Button
              variant="primary"
              size="xs"
              type="submit"
              isLoading={isSubmittingReply}
            >
              Reply
            </Button>
          </form>
        )}

        {/* Threaded Replies Toggle */}
        {(comment.replyCount > 0 || replies.length > 0) && (
          <div className="mt-2">
            <button
              type="button"
              onClick={toggleReplies}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FF3038] hover:text-[#ff5252] transition-colors"
            >
              {repliesOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              <span>
                {repliesOpen
                  ? 'Hide replies'
                  : `View ${comment.replyCount || replies.length} ${
                      (comment.replyCount || replies.length) === 1 ? 'reply' : 'replies'
                    }`}
              </span>
            </button>

            {/* Replies List */}
            {repliesOpen && (
              <div className="pl-4 mt-3 border-l-2 border-white/10 flex flex-col gap-3">
                {loadingReplies ? (
                  <div className="py-2">
                    <Loader2 className="w-4 h-4 text-[#FF3038] animate-spin" />
                  </div>
                ) : (
                  replies.map((reply) => (
                    <div key={reply._id} className="flex gap-2.5">
                      <Avatar
                        src={reply.author?.avatar?.url || reply.author?.avatar}
                        name={reply.author?.displayName || reply.author?.username}
                        size="xs"
                      />
                      <div className="flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-semibold text-white">
                            {reply.author?.displayName || reply.author?.username}
                          </span>
                          <span className="text-zinc-500 text-[10px]">
                            {formatTimeAgo(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-snug">{reply.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
