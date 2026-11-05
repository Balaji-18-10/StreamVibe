import { Server } from 'socket.io';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { verifyAccessToken } from '../utils/jwt.js';
import ChatMessage from '../models/ChatMessage.model.js';
import Video from '../models/Video.model.js';

let io;

/**
 * In-memory presence tracker:
 * Map<string(userId), Set<string(socketId)>>
 * Tracks multiple simultaneous socket connections for each user.
 */
const connectedUsers = new Map();

/**
 * In-memory muted chat users tracker:
 * Map<string(videoId:userId), number(expirationTimestampMs)>
 */
const mutedChatUsers = new Map();

// Periodic cleanup of expired muted user entries to prevent in-memory leaks (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, expiry] of mutedChatUsers.entries()) {
    if (now >= expiry) {
      mutedChatUsers.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

/**
 * Check if a user is currently online.
 * @param {string} userId
 * @returns {boolean}
 */
export const isUserOnline = (userId) => {
  if (!userId) return false;
  const sockets = connectedUsers.get(String(userId));
  return Boolean(sockets && sockets.size > 0);
};

/**
 * Get list of currently online user IDs.
 * @returns {string[]}
 */
export const getOnlineUserIds = () => {
  return Array.from(connectedUsers.keys());
};

/**
 * Get total count of distinct online users.
 * @returns {number}
 */
export const getOnlineUserCount = () => {
  return connectedUsers.size;
};

/**
 * Initialize Socket.IO server and attach to HTTP server.
 * Handles authentication, real-time notifications, live chat, presence, and room management.
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── 1. Authentication Middleware ───────────────────────
  io.use((socket, next) => {
    // Extract token safely from auth, headers, or query
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
      socket.handshake.query?.token;

    if (!token) {
      // Allow unauthenticated guest connections (read-only live chat viewing)
      socket.user = null;
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      socket.user = decoded;
      return next();
    } catch {
      // Reject invalid or expired tokens without logging credentials
      logger.warn(`Socket auth rejected for ${socket.id}: Invalid or expired token`);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  // ─── 2. Connection Handler ──────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user?._id?.toString();
    logger.info(`Socket connected: ${socket.id} | user: ${userId || 'guest'}`);

    // Track active chat rooms and rate limit timestamps on the socket
    socket.joinedRooms = new Set();
    socket.messageTimestamps = [];

    // Presence management & Personal Notification Room for authenticated users
    if (userId) {
      let userSockets = connectedUsers.get(userId);
      const isFirstConnection = !userSockets || userSockets.size === 0;

      if (!userSockets) {
        userSockets = new Set();
        connectedUsers.set(userId, userSockets);
      }
      userSockets.add(socket.id);

      // Automatically join the user's private notification room
      const personalRoom = `user:${userId}`;
      socket.join(personalRoom);
      socket.joinedRooms.add(personalRoom);

      // Broadcast online presence when user establishes first connection
      if (isFirstConnection) {
        io.emit('user:status', { userId, isOnline: true });
        io.emit('user:online', { userId });
      }
    }

    // ─── 3. Room Management & Private Room Protection ───────
    socket.on('room:join', ({ room }, callback) => {
      try {
        if (!room || typeof room !== 'string') {
          socket.emit('error', { message: 'Invalid room identifier.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Invalid room identifier' });
          return;
        }

        // Strictly prevent unauthorized access to private notification rooms
        if (room.startsWith('user:')) {
          const targetUserId = room.replace('user:', '');
          if (!userId || userId !== targetUserId) {
            socket.emit('error', { message: 'Unauthorized: Cannot join another user\'s private notification room.' });
            if (typeof callback === 'function') callback({ success: false, message: 'Unauthorized room access' });
            return;
          }
        }

        socket.join(room);
        socket.joinedRooms.add(room);
        if (typeof callback === 'function') callback({ success: true, room });
      } catch (err) {
        logger.error('Error in room:join:', err.message);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    });

    socket.on('room:leave', ({ room }, callback) => {
      try {
        if (room) {
          socket.leave(room);
          socket.joinedRooms.delete(room);
        }
        if (typeof callback === 'function') callback({ success: true, room });
      } catch (err) {
        logger.error('Error in room:leave:', err.message);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    });

    // ─── 4. Live Chat: Join & Leave ─────────────────────────
    socket.on('chat:join', async ({ videoId }, callback) => {
      try {
        if (!videoId) {
          socket.emit('chat:error', { message: 'Video ID is required to join chat.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Video ID is required' });
          return;
        }

        if (!mongoose.Types.ObjectId.isValid(videoId)) {
          socket.emit('chat:error', { message: 'Invalid video ID format.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Invalid video ID format' });
          return;
        }

        // Verify video exists and enforce privacy access controls
        const video = await Video.findById(videoId).select('visibility owner isPublished');
        if (!video) {
          socket.emit('chat:error', { message: 'Video not found.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Video not found' });
          return;
        }

        if (video.visibility === 'private') {
          const isOwner = userId && userId === video.owner.toString();
          if (!isOwner) {
            socket.emit('chat:error', { message: 'Cannot join chat for a private video.' });
            if (typeof callback === 'function') callback({ success: false, message: 'Cannot join chat for a private video' });
            return;
          }
        }

        const roomName = `chat:${videoId}`;
        socket.join(roomName);
        socket.joinedRooms.add(roomName);

        const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 1;
        io.to(roomName).emit('chat:viewer_count', { videoId, viewerCount: roomSize });

        // Retrieve recent 50 chat messages from MongoDB in chronological order
        const history = await ChatMessage.find({ video: videoId })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate('user', 'username displayName avatar')
          .lean();

        const formattedHistory = history.reverse();

        // Emit recent chat history to the newly joined client
        socket.emit('chat:history', {
          videoId,
          messages: formattedHistory,
          viewerCount: roomSize,
        });

        if (typeof callback === 'function') {
          callback({ success: true, videoId, messages: formattedHistory, viewerCount: roomSize });
        }
      } catch (err) {
        logger.error('Error in chat:join:', err.message);
        socket.emit('chat:error', { message: 'Failed to join chat room.' });
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    });

    socket.on('chat:leave', ({ videoId }, callback) => {
      try {
        if (videoId) {
          const roomName = `chat:${videoId}`;
          socket.leave(roomName);
          socket.joinedRooms.delete(roomName);
          const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
          io.to(roomName).emit('chat:viewer_count', { videoId, viewerCount: roomSize });
        }
        if (typeof callback === 'function') callback({ success: true, videoId });
      } catch (err) {
        logger.error('Error in chat:leave:', err.message);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    });

    socket.on('chat:typing', ({ videoId }) => {
      if (!videoId || !socket.user) return;
      socket.to(`chat:${videoId}`).emit('chat:typing', {
        videoId,
        user: {
          _id: socket.user._id,
          username: socket.user.username,
          displayName: socket.user.displayName,
        },
      });
    });

    socket.on('chat:stop_typing', ({ videoId }) => {
      if (!videoId || !socket.user) return;
      socket.to(`chat:${videoId}`).emit('chat:stop_typing', {
        videoId,
        userId: socket.user._id,
      });
    });

    // ─── 5. Live Chat: Send Message ─────────────────────────
    socket.on('chat:message', async (data, callback) => {
      try {
        // Must be authenticated to send messages
        if (!socket.user || !userId) {
          socket.emit('chat:error', { message: 'Authentication required to participate in live chat.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Authentication required' });
          return;
        }

        const { videoId, message } = data || {};

        if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
          socket.emit('chat:error', { message: 'Invalid or missing video ID.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Invalid or missing video ID' });
          return;
        }

        if (!message || typeof message !== 'string' || !message.trim()) {
          socket.emit('chat:error', { message: 'Message content cannot be empty.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Message content cannot be empty' });
          return;
        }

        const trimmedMessage = message.trim();
        if (trimmedMessage.length > 500) {
          socket.emit('chat:error', { message: 'Message cannot exceed 500 characters.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Message cannot exceed 500 characters' });
          return;
        }

        // Check if user is temporarily muted in this video chat
        const muteKey = `${videoId}:${userId}`;
        const muteExpiry = mutedChatUsers.get(muteKey);
        if (muteExpiry) {
          if (Date.now() < muteExpiry) {
            const remainingSec = Math.ceil((muteExpiry - Date.now()) / 1000);
            socket.emit('chat:error', {
              message: `You are temporarily timed out in this chat. (${remainingSec}s remaining)`,
              code: 'USER_MUTED',
              remainingSeconds: remainingSec,
            });
            if (typeof callback === 'function') {
              callback({ success: false, message: `You have been timed out from this chat. (${remainingSec}s remaining)` });
            }
            return;
          } else {
            mutedChatUsers.delete(muteKey);
          }
        }

        // Anti-Spam Rate Limiting: max 5 messages per 4 seconds per socket
        const now = Date.now();
        socket.messageTimestamps = (socket.messageTimestamps || []).filter(
          (timestamp) => now - timestamp < 4000
        );

        if (socket.messageTimestamps.length >= 5) {
          socket.emit('chat:error', {
            message: 'You are sending messages too quickly. Please slow down.',
            code: 'RATE_LIMIT_EXCEEDED',
          });
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Rate limit exceeded. Please wait a moment.' });
          }
          return;
        }
        socket.messageTimestamps.push(now);

        // Verify video exists and is accessible
        const video = await Video.findById(videoId).select('visibility owner');
        if (!video) {
          socket.emit('chat:error', { message: 'Video not found.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Video not found' });
          return;
        }

        if (video.visibility === 'private' && userId !== video.owner.toString()) {
          socket.emit('chat:error', { message: 'Cannot chat on a private video.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Cannot chat on a private video' });
          return;
        }

        // Persist message in MongoDB
        const chatDoc = await ChatMessage.create({
          video: videoId,
          user: userId,
          message: trimmedMessage,
        });

        const populatedMessage = await ChatMessage.findById(chatDoc._id)
          .populate('user', 'username displayName avatar')
          .lean();

        const broadcastPayload = {
          _id: populatedMessage._id,
          videoId,
          user: populatedMessage.user,
          message: populatedMessage.message,
          createdAt: populatedMessage.createdAt,
        };

        // Broadcast to all participants in the video chat room
        io.to(`chat:${videoId}`).emit('chat:message', broadcastPayload);

        if (typeof callback === 'function') {
          callback({ success: true, data: broadcastPayload });
        }
      } catch (err) {
        logger.error('Error in chat:message:', err.message);
        socket.emit('chat:error', { message: 'Failed to send message.' });
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    });

    // ─── 5b. Live Chat: Delete Message (Moderation) ─────────
    socket.on('chat:delete_message', async ({ videoId, messageId }, callback) => {
      try {
        if (!socket.user || !userId) {
          socket.emit('chat:error', { message: 'Authentication required to delete messages.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Authentication required' });
          return;
        }

        if (!videoId || !messageId) {
          socket.emit('chat:error', { message: 'Video ID and Message ID are required.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Video ID and Message ID are required' });
          return;
        }

        const video = await Video.findById(videoId).select('owner');
        if (!video) {
          socket.emit('chat:error', { message: 'Video not found.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Video not found' });
          return;
        }

        const isOwner = video.owner.toString() === userId;
        const isAdmin = socket.user.role === 'admin';

        if (!isOwner && !isAdmin) {
          socket.emit('chat:error', { message: 'Only the video creator or administrators can delete chat messages.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Not authorized to moderate this chat' });
          return;
        }

        await ChatMessage.deleteOne({ _id: messageId, video: videoId });

        // Broadcast deletion event to all participants in this video chat
        io.to(`chat:${videoId}`).emit('chat:message_deleted', { videoId, messageId });

        if (typeof callback === 'function') callback({ success: true, messageId });
      } catch (err) {
        logger.error('Error in chat:delete_message:', err.message);
        socket.emit('chat:error', { message: 'Failed to delete message.' });
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    });

    // ─── 5c. Live Chat: Mute / Timeout User (Moderation) ────
    socket.on('chat:mute_user', async ({ videoId, targetUserId, durationSeconds = 300 }, callback) => {
      try {
        if (!socket.user || !userId) {
          socket.emit('chat:error', { message: 'Authentication required to timeout users.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Authentication required' });
          return;
        }

        if (!videoId || !targetUserId) {
          socket.emit('chat:error', { message: 'Video ID and target User ID are required.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Video ID and target User ID are required' });
          return;
        }

        const video = await Video.findById(videoId).select('owner');
        if (!video) {
          socket.emit('chat:error', { message: 'Video not found.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Video not found' });
          return;
        }

        const isOwner = video.owner.toString() === userId;
        const isAdmin = socket.user.role === 'admin';

        if (!isOwner && !isAdmin) {
          socket.emit('chat:error', { message: 'Only the video creator or administrators can timeout users.' });
          if (typeof callback === 'function') callback({ success: false, message: 'Not authorized to moderate this chat' });
          return;
        }

        const duration = Math.max(10, Math.min(Number(durationSeconds) || 300, 86400));
        const muteKey = `${videoId}:${targetUserId}`;
        const expiry = Date.now() + duration * 1000;
        mutedChatUsers.set(muteKey, expiry);

        // Broadcast timeout event to chat room
        io.to(`chat:${videoId}`).emit('chat:user_muted', {
          videoId,
          userId: targetUserId,
          durationSeconds: duration,
        });

        if (typeof callback === 'function') {
          callback({ success: true, targetUserId, durationSeconds: duration });
        }
      } catch (err) {
        logger.error('Error in chat:mute_user:', err.message);
        socket.emit('chat:error', { message: 'Failed to mute user.' });
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    });

    // ─── 6. Presence Queries ────────────────────────────────
    socket.on('presence:status', ({ userId: queryUserId }, callback) => {
      const isOnline = isUserOnline(queryUserId);
      if (typeof callback === 'function') {
        callback({ userId: queryUserId, isOnline });
      } else {
        socket.emit('presence:status', { userId: queryUserId, isOnline });
      }
    });

    socket.on('presence:list', (callback) => {
      const onlineIds = getOnlineUserIds();
      if (typeof callback === 'function') {
        callback({ onlineCount: onlineIds.length, userIds: onlineIds });
      } else {
        socket.emit('presence:list', { onlineCount: onlineIds.length, userIds: onlineIds });
      }
    });

    // ─── 7. Disconnection Cleanup ───────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} | reason: ${reason}`);

      // Clean up in-memory tracking on the socket
      if (socket.joinedRooms) {
        socket.joinedRooms.forEach((r) => {
          if (r.startsWith('chat:')) {
            const vId = r.replace('chat:', '');
            const currentSize = io.sockets.adapter.rooms.get(r)?.size || 1;
            const remaining = Math.max(0, currentSize - 1);
            socket.to(r).emit('chat:viewer_count', { videoId: vId, viewerCount: remaining });
          }
        });
        socket.joinedRooms.clear();
      }
      socket.messageTimestamps = null;

      // Update presence if user was authenticated
      if (userId) {
        const userSockets = connectedUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            connectedUsers.delete(userId);
            // Broadcast offline presence event (public info only: userId and status)
            io.emit('user:status', { userId, isOnline: false });
            io.emit('user:offline', { userId });
          }
        }
      }
    });
  });

  return io;
};

/**
 * Get the initialized Socket.IO instance.
 * @returns {Server}
 */
export const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};
