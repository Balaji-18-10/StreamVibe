import { create } from 'zustand';

/**
 * UI store — sidebar state, theme, modals.
 */
export const useUIStore = create((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: 'dark', // StreamVibe is always dark, but stored for future

  // Modals
  loginModalOpen: false,
  uploadModalOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  collapseSidebar: (val) => set({ sidebarCollapsed: val }),
  setSidebarOpen: (val) => set({ sidebarOpen: val }),

  openLoginModal: () => set({ loginModalOpen: true }),
  closeLoginModal: () => set({ loginModalOpen: false }),
  openUploadModal: () => set({ uploadModalOpen: true }),
  closeUploadModal: () => set({ uploadModalOpen: false }),
}));
