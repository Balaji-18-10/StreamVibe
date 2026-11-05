import api from './api.js';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.patch('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),
};

export const videoService = {
  getAll: (params) => api.get('/videos', { params }),
  getById: (id) => api.get(`/videos/${id}`),
  getTrending: (params) => api.get('/videos/trending', { params }),
  getShorts: (params) => api.get('/videos/shorts', { params }),
  getChannelVideos: (username, params) => api.get(`/videos/channel/${username}`, { params }),
  getStudioVideos: (params) => api.get('/videos/studio/my-videos', { params }),
  getRecommended: (id) => api.get(`/videos/${id}/recommended`),
  incrementView: (id) => api.post(`/videos/${id}/view`),
  upload: (formData, onProgress) =>
    api.post('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
      onUploadProgress: (e) => {
        if (e.total) {
          onProgress?.(Math.round((e.loaded * 100) / e.total));
        }
      },
    }),
  update: (id, formData) =>
    api.patch(`/videos/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/videos/${id}`),
};

export const userService = {
  getChannel: (username) => api.get(`/users/${username}`),
  getPlaylists: (username) => api.get(`/users/${username}/playlists`),
  updateProfile: (data) => api.patch('/users/me/profile', data),
  updateAvatar: (formData) => api.patch('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateBanner: (formData) => api.patch('/users/me/banner', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteAccount: (data) => api.delete('/users/me', { data }),
  getHistory: (params) => api.get('/users/me/history', { params }),
  removeFromHistory: (videoId) => api.delete(`/users/me/history/${videoId}`),
  clearHistory: () => api.delete('/users/me/history'),
};

export const commentService = {
  getByVideo: (videoId, params) => api.get(`/comments/video/${videoId}`, { params }),
  getReplies: (commentId) => api.get(`/comments/${commentId}/replies`),
  add: (videoId, data) => api.post(`/comments/video/${videoId}`, data),
  update: (commentId, data) => api.patch(`/comments/${commentId}`, data),
  delete: (commentId) => api.delete(`/comments/${commentId}`),
  pin: (commentId) => api.patch(`/comments/${commentId}/pin`),
};

export const likeService = {
  toggle: (entityType, entityId, type) => api.post(`/likes/${entityType}/${entityId}`, { type }),
  getStatus: (entityType, entityId) => api.get(`/likes/${entityType}/${entityId}`),
  getLikedVideos: (params) => api.get('/likes/videos', { params }),
};

export const subscriptionService = {
  toggle: (channelId) => api.post(`/subscriptions/${channelId}`),
  getStatus: (channelId) => api.get(`/subscriptions/${channelId}/status`),
  getSubscribed: (params) => api.get('/subscriptions/me/channels', { params }),
  updateNotification: (channelId, level) => api.patch(`/subscriptions/${channelId}/notifications`, { level }),
};

export const playlistService = {
  create: (data) => api.post('/playlists', data),
  getByUser: (userId) => api.get(`/playlists/user/${userId}`),
  getMyPlaylists: () => api.get('/playlists/me'),
  getById: (id) => api.get(`/playlists/${id}`),
  update: (id, data) => api.patch(`/playlists/${id}`, data),
  delete: (id) => api.delete(`/playlists/${id}`),
  addVideo: (id, videoId) => api.post(`/playlists/${id}/videos`, { videoId }),
  removeVideo: (id, videoId) => api.delete(`/playlists/${id}/videos/${videoId}`),
  reorder: (id, videoIds) => api.patch(`/playlists/${id}/reorder`, { videoIds }),
  getWatchLater: () => api.get('/playlists/system/watch-later'),
  addToWatchLater: (videoId) => api.post('/playlists/system/watch-later/videos', { videoId }),
  removeFromWatchLater: (videoId) => api.delete(`/playlists/system/watch-later/videos/${videoId}`),
};

export const searchService = {
  search: (params, config = {}) => api.get('/search', { params, ...config }),
  suggestions: (q, config = {}) => api.get('/search/suggestions', { params: { q }, ...config }),
};

export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const analyticsService = {
  getChannel: () => api.get('/analytics/channel'),
  getVideo: (videoId) => api.get(`/analytics/video/${videoId}`),
  getAudience: () => api.get('/analytics/audience'),
};

export const chatService = {
  getHistory: (videoId, params) => api.get(`/videos/${videoId}/chat`, { params }),
};

export const reportService = {
  create: (data) => api.post('/reports', data),
  getMyReports: () => api.get('/reports/my'),
};

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getReports: (params) => api.get('/admin/reports', { params }),
  getReportById: (id) => api.get(`/admin/reports/${id}`),
  updateReport: (id, data) => api.patch(`/admin/reports/${id}`, data),
  takedown: (id, data) => api.post(`/admin/reports/${id}/takedown`, data),
};

