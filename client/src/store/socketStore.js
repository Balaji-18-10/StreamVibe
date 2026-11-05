import { create } from 'zustand';
import { io } from 'socket.io-client';
import { notificationService } from '../services/index.js';

/**
 * Socket store — manages Socket.IO connection lifecycle and Real-Time Notifications.
 * Connect once when user authenticates, disconnect on logout.
 */
export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  notifications: [],
  unreadCount: 0,
  isLoadingNotifications: false,
  activeToast: null,

  connect: (accessToken = null) => {
    const existing = get().socket;
    if (existing?.connected) {
      if (accessToken && existing.auth?.token !== accessToken) {
        // Reconnect with new auth token
        existing.auth = { token: accessToken };
        existing.disconnect().connect();
        return;
      }
      return;
    }

    if (existing) {
      existing.disconnect();
    }

    const defaultSocketUrl =
      import.meta.env.PROD && typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:5000';

    const socket = io(import.meta.env.VITE_SOCKET_URL || defaultSocketUrl, {
      auth: accessToken ? { token: accessToken } : {},
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    // Real-time notification receiver
    socket.on('notification', (newNotif) => {
      if (!newNotif || !newNotif._id) return;

      set((state) => {
        // Prevent duplicate notification
        const exists = state.notifications.some((n) => String(n._id) === String(newNotif._id));
        if (exists) return state;

        return {
          notifications: [newNotif, ...state.notifications].slice(0, 50),
          unreadCount: state.unreadCount + 1,
          activeToast: newNotif,
        };
      });
    });

    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({
        socket: null,
        isConnected: false,
        unreadCount: 0,
        notifications: [],
        activeToast: null,
      });
    }
  },

  dismissToast: () => set({ activeToast: null }),

  fetchNotifications: async (filter = 'all') => {
    set({ isLoadingNotifications: true });
    try {
      const res = await notificationService.getAll({ filter, limit: 30 });
      if (res.data?.success) {
        set({
          notifications: res.data.data.notifications || [],
          unreadCount: res.data.data.unreadCount || 0,
          isLoadingNotifications: false,
        });
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      set({ isLoadingNotifications: false });
    }
  },

  markAsRead: async (id) => {
    try {
      const res = await notificationService.markRead(id);
      if (res.data?.success) {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            String(n._id) === String(id) ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, res.data.data.unreadCount ?? state.unreadCount - 1),
        }));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      const res = await notificationService.markAllRead();
      if (res.data?.success) {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  },

  deleteNotification: async (id) => {
    try {
      const res = await notificationService.delete(id);
      if (res.data?.success) {
        set((state) => ({
          notifications: state.notifications.filter((n) => String(n._id) !== String(id)),
          unreadCount: Math.max(0, res.data.data.unreadCount ?? state.unreadCount),
        }));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  },

  clearUnread: () => set({ unreadCount: 0 }),

  // Join/leave video chat room
  joinChat: (videoId, callback) => get().socket?.emit('chat:join', { videoId }, callback),
  leaveChat: (videoId, callback) => get().socket?.emit('chat:leave', { videoId }, callback),
  sendMessage: (videoId, message, callback) =>
    get().socket?.emit('chat:message', { videoId, message }, callback),
  emitTyping: (videoId) => get().socket?.emit('chat:typing', { videoId }),
  emitStopTyping: (videoId) => get().socket?.emit('chat:stop_typing', { videoId }),
}));
