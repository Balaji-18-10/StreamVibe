import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/index.js';

/**
 * Auth store — persists user + token to localStorage.
 * Provides login, logout, register, token refresh, and password recovery actions.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isCheckingAuth: false,
      error: null,

      // ── Actions ──────────────────────────────────────────
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authService.login(credentials);
          const { user, accessToken } = data.data;
          localStorage.setItem('accessToken', accessToken);
          set({ user, accessToken, isAuthenticated: true, isLoading: false, error: null });
          return { success: true, user };
        } catch (err) {
          const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authService.register(userData);
          const { user, accessToken } = data.data;
          localStorage.setItem('accessToken', accessToken);
          set({ user, accessToken, isAuthenticated: true, isLoading: false, error: null });
          return { success: true, user };
        } catch (err) {
          const message = err.response?.data?.message || 'Registration failed. Please try again.';
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authService.forgotPassword({ email });
          set({ isLoading: false });
          return { success: true, data: data.data, message: data.message };
        } catch (err) {
          const message = err.response?.data?.message || 'Failed to request password reset.';
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      resetPassword: async (token, newPassword) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authService.resetPassword(token, { password: newPassword });
          const { user, accessToken } = data.data || {};
          if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
            set({ user, accessToken, isAuthenticated: true, isLoading: false, error: null });
          } else {
            set({ isLoading: false });
          }
          return { success: true, message: data.message };
        } catch (err) {
          const message = err.response?.data?.message || 'Password reset failed or token expired.';
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token && !get().isAuthenticated) {
          return null;
        }

        set({ isCheckingAuth: true });
        try {
          const { data } = await authService.getMe();
          const user = data.data?.user || data.data;
          set({ user, isAuthenticated: true, isCheckingAuth: false });
          return user;
        } catch {
          // Token may be expired, attempt refresh
          try {
            const { data } = await authService.refreshToken();
            const { accessToken, user } = data.data;
            localStorage.setItem('accessToken', accessToken);
            set({ user, accessToken, isAuthenticated: true, isCheckingAuth: false });
            return user;
          } catch {
            localStorage.removeItem('accessToken');
            set({ user: null, accessToken: null, isAuthenticated: false, isCheckingAuth: false });
            return null;
          }
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Ignore network errors on logout
        } finally {
          localStorage.removeItem('accessToken');
          set({ user: null, accessToken: null, isAuthenticated: false, error: null });
        }
      },

      updateUser: (updatedFields) => {
        set((state) => ({ user: { ...state.user, ...updatedFields } }));
      },

      setToken: (token) => {
        if (token) {
          localStorage.setItem('accessToken', token);
        } else {
          localStorage.removeItem('accessToken');
        }
        set({ accessToken: token });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'streamvibe-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Listen for global auth:logout events from api interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      error: null,
    });
  });
}
