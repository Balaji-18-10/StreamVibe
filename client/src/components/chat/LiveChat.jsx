import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  Loader2,
  Sparkles,
  Crown,
  CornerDownLeft,
  ArrowDown,
  Clock,
  Radio,
  Trash2,
  UserX,
} from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import { chatService } from '../../services/index.js';

export default function LiveChat({
  videoId,
  videoOwnerId,
  isLive = false,
  isOpen = true,
  onToggleOpen,
  className = '',
}) {
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const {
    socket,
    isConnected,
    connect,
    joinChat,
    leaveChat,
    sendMessage,
    emitTyping,
    emitStopTyping,
  } = useSocketStore();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(1);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Map()); // Map<userId, { username, displayName }>
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // ─── 1. Ensure Socket Connection ─────────────────────────────
  useEffect(() => {
    connect(accessToken);
  }, [connect, accessToken]);

  // ─── 2. Join Video Room & Socket Listeners ────────────────────
  useEffect(() => {
    if (!videoId || !socket) return;

    setIsLoadingHistory(true);
    setErrorMessage('');

    // Join chat room via socket
    joinChat(videoId, (res) => {
      if (res?.success && Array.isArray(res.messages)) {
        setMessages(res.messages);
        if (typeof res.viewerCount === 'number') {
          setViewerCount(res.viewerCount);
        }
        setIsLoadingHistory(false);
      }
    });

    // Fallback REST fetch if history hasn't loaded in 2 seconds
    const fallbackTimer = setTimeout(async () => {
      if (messages.length === 0) {
        try {
          const res = await chatService.getHistory(videoId, { limit: 50 });
          if (res.data?.success && Array.isArray(res.data.data?.messages)) {
            setMessages(res.data.data.messages);
          }
        } catch {
          // Ignore fallback error
        } finally {
          setIsLoadingHistory(false);
        }
      }
    }, 2000);

    // Incoming chat message listener
    const handleIncomingMessage = (newMsg) => {
      if (!newMsg || String(newMsg.videoId) !== String(videoId)) return;

      setMessages((prev) => {
        // Prevent duplicate messages
        const exists = prev.some((m) => String(m._id) === String(newMsg._id));
        if (exists) return prev;
        return [...prev, newMsg].slice(-200); // Keep last 200 messages in memory
      });
    };

    // Chat history listener
    const handleChatHistory = (data) => {
      if (data?.videoId && String(data.videoId) === String(videoId) && Array.isArray(data.messages)) {
        setMessages(data.messages);
        if (typeof data.viewerCount === 'number') {
          setViewerCount(data.viewerCount);
        }
        setIsLoadingHistory(false);
      }
    };

    // Viewer count update listener
    const handleViewerCount = (data) => {
      if (data?.videoId && String(data.videoId) === String(videoId) && typeof data.viewerCount === 'number') {
        setViewerCount(data.viewerCount);
      }
    };

    // Typing indicators
    const handleUserTyping = (data) => {
      if (data?.videoId && String(data.videoId) === String(videoId) && data.user) {
        // Skip self typing
        if (user?._id && String(user._id) === String(data.user._id)) return;

        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.set(String(data.user._id), data.user);
          return next;
        });

        // Auto remove typing indicator after 3.5s of inactivity
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(String(data.user._id));
            return next;
          });
        }, 3500);
      }
    };

    const handleUserStopTyping = (data) => {
      if (data?.videoId && String(data.videoId) === String(videoId) && data.userId) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(String(data.userId));
          return next;
        });
      }
    };

    // Message deleted listener
    const handleMessageDeleted = (data) => {
      if (data?.videoId && String(data.videoId) === String(videoId) && data.messageId) {
        setMessages((prev) => prev.filter((m) => String(m._id) !== String(data.messageId)));
      }
    };

    // User muted listener
    const handleUserMuted = (data) => {
      if (data?.videoId && String(data.videoId) === String(videoId)) {
        if (user?._id && String(user._id) === String(data.userId)) {
          setErrorMessage(`You have been timed out by a moderator for ${data.durationSeconds}s.`);
        }
      }
    };

    // Chat error listener (e.g. rate limit, validation)
    const handleChatError = (err) => {
      if (err?.message) {
        setErrorMessage(err.message);
        setTimeout(() => setErrorMessage(''), 5000);
      }
    };

    socket.on('chat:message', handleIncomingMessage);
    socket.on('chat:history', handleChatHistory);
    socket.on('chat:viewer_count', handleViewerCount);
    socket.on('chat:typing', handleUserTyping);
    socket.on('chat:stop_typing', handleUserStopTyping);
    socket.on('chat:message_deleted', handleMessageDeleted);
    socket.on('chat:user_muted', handleUserMuted);
    socket.on('chat:error', handleChatError);

    return () => {
      clearTimeout(fallbackTimer);
      leaveChat(videoId);
      socket.off('chat:message', handleIncomingMessage);
      socket.off('chat:history', handleChatHistory);
      socket.off('chat:viewer_count', handleViewerCount);
      socket.off('chat:typing', handleUserTyping);
      socket.off('chat:stop_typing', handleUserStopTyping);
      socket.off('chat:message_deleted', handleMessageDeleted);
      socket.off('chat:user_muted', handleUserMuted);
      socket.off('chat:error', handleChatError);
    };
  }, [videoId, socket, joinChat, leaveChat, user]);

  // ─── 3. Auto Scroll & Scroll Detection ───────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
    setShowScrollBottom(false);
  }, []);

  const handleScroll = () => {
    const el = chatScrollContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollBottom(!isAtBottom);
  };

  useEffect(() => {
    // If user is near bottom, automatically scroll to latest message
    if (!showScrollBottom) {
      scrollToBottom(false);
    }
  }, [messages, showScrollBottom, scrollToBottom]);

  // ─── 4. Message Input & Typing Handler ───────────────────────
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (errorMessage) setErrorMessage('');

    // Emit typing indicator to room
    if (val.trim()) {
      emitTyping(videoId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitStopTyping(videoId);
      }, 2500);
    } else {
      emitStopTyping(videoId);
    }
  };

  // ─── 5. Send Message ─────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e?.preventDefault();

    if (!isAuthenticated) {
      navigate(`/login?redirect=/watch/${videoId}`);
      return;
    }

    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    if (trimmed.length > 500) {
      setErrorMessage('Message cannot exceed 500 characters.');
      return;
    }

    setIsSending(true);
    setErrorMessage('');
    emitStopTyping(videoId);

    sendMessage(videoId, trimmed, (res) => {
      setIsSending(false);
      if (res?.success) {
        setInputText('');
        scrollToBottom(true);
      } else {
        setErrorMessage(res?.message || 'Failed to send message.');
      }
    });

    // Optimistic fallback in case socket acknowledgment is delayed
    setTimeout(() => {
      setIsSending(false);
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format time (HH:MM AM/PM)
  const formatMsgTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isOwner = user?._id && String(videoOwnerId) === String(user._id);
  const isAdmin = user?.role === 'admin';
  const canModerate = isOwner || isAdmin;

  const handleDeleteMessage = (messageId) => {
    if (!socket || !canModerate) return;
    socket.emit('chat:delete_message', { videoId, messageId }, (res) => {
      if (res?.success) {
        setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
      } else if (res?.message) {
        setErrorMessage(res.message);
      }
    });
  };

  const handleMuteUser = (targetUserId, targetUsername) => {
    if (!socket || !canModerate) return;
    if (!window.confirm(`Timeout @${targetUsername || 'user'} for 5 minutes?`)) return;
    socket.emit('chat:mute_user', { videoId, targetUserId, durationSeconds: 300 }, (res) => {
      if (res?.success) {
        setErrorMessage(`User timed out for 5 minutes.`);
        setTimeout(() => setErrorMessage(''), 3000);
      } else if (res?.message) {
        setErrorMessage(res.message);
      }
    });
  };

  // Array of active typing user names
  const typingList = Array.from(typingUsers.values()).map(
    (u) => u.displayName || u.username
  );

  return (
    <div
      className={`bg-[#17171D] border border-[#23232C] rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${
        isOpen ? 'h-[520px] sm:h-[580px] lg:h-[620px]' : 'h-14'
      } ${className}`}
    >
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="h-14 px-4 sm:px-5 border-b border-white/5 flex items-center justify-between bg-[#17171D] shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <Radio className="w-4 h-4 text-[#FF3038] animate-pulse" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-wide">Live Chat</h3>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[11px] font-semibold text-zinc-400">
            <Users className="w-3 h-3 text-zinc-400" />
            <span>{viewerCount}</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle Timestamps */}
          <button
            type="button"
            onClick={() => setShowTimestamps((prev) => !prev)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showTimestamps
                ? 'text-zinc-300 hover:text-white bg-white/5'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={showTimestamps ? 'Hide timestamps' : 'Show timestamps'}
            aria-label="Toggle timestamps"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>

          {/* Toggle collapse / expand */}
          {onToggleOpen && (
            <button
              type="button"
              onClick={onToggleOpen}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              title={isOpen ? 'Collapse Chat' : 'Expand Chat'}
              aria-label={isOpen ? 'Collapse Chat' : 'Expand Chat'}
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <>
          {/* Error Banner */}
          {errorMessage && (
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-300 flex items-center justify-between animate-fade-in shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-red-400 hover:text-red-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ─── Messages List Container ───────────────────────── */}
          <div
            ref={chatScrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 relative scrollbar-thin scrollbar-thumb-zinc-700"
          >
            {/* Community Notice */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-[11px] text-zinc-400 text-center leading-relaxed mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#FF3038] inline mr-1" />
              Welcome to the live chat! Remember to keep comments respectful and abide by our
              community guidelines.
            </div>

            {isLoadingHistory ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-xs text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin text-[#FF3038]" />
                <span>Connecting to live chat stream...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center px-4">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 mb-2">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-zinc-300">No messages yet</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Be the first to say something in live chat!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isCreator =
                  videoOwnerId && msg.user?._id && String(msg.user._id) === String(videoOwnerId);
                const isSelf = user?._id && msg.user?._id && String(msg.user._id) === String(user._id);

                return (
                  <div
                    key={msg._id || idx}
                    className={`flex items-start gap-2.5 py-1 px-1.5 rounded-xl transition-colors hover:bg-white/[0.04] text-xs leading-relaxed group ${
                      isSelf ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    {/* User Avatar */}
                    <Link
                      to={msg.user?.username ? `/@${msg.user.username}` : '#'}
                      className="shrink-0 mt-0.5"
                    >
                      <Avatar
                        src={msg.user?.avatar?.url || msg.user?.avatar}
                        name={msg.user?.displayName || msg.user?.username || 'Guest'}
                        size="xs"
                      />
                    </Link>

                    {/* Content & Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={msg.user?.username ? `/@${msg.user.username}` : '#'}
                          className={`font-bold hover:underline truncate max-w-[140px] ${
                            isCreator
                              ? 'text-amber-400'
                              : isSelf
                              ? 'text-[#FF3038]'
                              : 'text-zinc-300'
                          }`}
                        >
                          {msg.user?.displayName || msg.user?.username || 'User'}
                        </Link>

                        {/* Creator Badge */}
                        {isCreator && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                            <Crown className="w-2.5 h-2.5" />
                            <span>Host</span>
                          </span>
                        )}

                        {/* Timestamp */}
                        {showTimestamps && msg.createdAt && (
                          <span className="text-[10px] text-zinc-500 ml-auto font-mono">
                            {formatMsgTime(msg.createdAt)}
                          </span>
                        )}
                      </div>

                      {/* Message Text */}
                      <p className="text-zinc-200 mt-0.5 break-words whitespace-pre-wrap selection:bg-[#FF3038]/30">
                        {msg.message}
                      </p>

                      {/* Moderation Actions (video creator or admin) */}
                      {canModerate && msg._id && !isSelf && (
                        <div className="hidden group-hover:flex items-center gap-2 mt-1 pt-1 border-t border-white/5 animate-fade-in">
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg._id)}
                            className="text-[10px] text-zinc-400 hover:text-red-400 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
                            title="Delete this message"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Delete</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleMuteUser(
                                msg.user?._id,
                                msg.user?.displayName || msg.user?.username
                              )
                            }
                            className="text-[10px] text-zinc-400 hover:text-amber-400 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
                            title="Timeout user for 5 minutes"
                          >
                            <UserX className="w-2.5 h-2.5" />
                            <span>Timeout (5m)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ─── Floating "Scroll to bottom" Pill ──────────────── */}
          {showScrollBottom && (
            <div className="relative">
              <button
                type="button"
                onClick={() => scrollToBottom(true)}
                className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#FF3038] hover:bg-[#E0222A] text-white text-[11px] font-bold rounded-full shadow-lg shadow-black/80 flex items-center gap-1.5 transition-transform active:scale-95 z-20 cursor-pointer animate-bounce-subtle"
              >
                <span>Latest messages</span>
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ─── Typing Indicators ─────────────────────────────── */}
          {typingList.length > 0 && (
            <div className="px-4 py-1 text-[11px] text-zinc-400 italic bg-[#17171D] border-t border-white/5 flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3038] animate-ping" />
              <span>
                {typingList.length === 1
                  ? `${typingList[0]} is typing...`
                  : `${typingList.slice(0, 2).join(', ')} are typing...`}
              </span>
            </div>
          )}

          {/* ─── Message Input Area ────────────────────────────── */}
          <div className="p-3 bg-[#131318] border-t border-white/5 shrink-0">
            {isAuthenticated ? (
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={user?.avatar?.url || user?.avatar}
                    name={user?.displayName || user?.username}
                    size="xs"
                    className="shrink-0"
                  />

                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Say something in live chat... (Enter to send)"
                      maxLength={500}
                      disabled={isSending}
                      className="w-full bg-[#1C1C24] border border-[#2B2B36] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-white placeholder-zinc-500 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-colors resize-none overflow-hidden leading-normal"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!inputText.trim() || isSending}
                    isLoading={isSending}
                    className="rounded-xl px-3 py-2 shrink-0 shadow-lg shadow-[#FF3038]/20"
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
                  <span>Shift + Enter for new line</span>
                  <span>{inputText.length} / 500</span>
                </div>
              </form>
            ) : (
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-400">Sign in to join the conversation</p>
                <Button
                  to={`/login?redirect=/watch/${videoId}`}
                  variant="primary"
                  size="xs"
                  className="rounded-full font-bold px-4 shrink-0 shadow-md shadow-[#FF3038]/20"
                >
                  Sign In
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
