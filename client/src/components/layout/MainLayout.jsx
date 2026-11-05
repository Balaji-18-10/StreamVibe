import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import BottomNav from './BottomNav.jsx';
import NotificationToast from './NotificationToast.jsx';
import { useUIStore } from '../../store/uiStore.js';

export default function MainLayout() {
  const location = useLocation();
  const { sidebarCollapsed, collapseSidebar, setSidebarOpen } = useUIStore();

  // Watch and Shorts pages have a collapsed sidebar by default
  const isWatchPage = location.pathname.startsWith('/watch/');
  const isShortsPage = location.pathname.startsWith('/shorts');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280 || isWatchPage || isShortsPage) {
        collapseSidebar(true);
      } else {
        collapseSidebar(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [collapseSidebar, isWatchPage, isShortsPage]);

  // Reset scroll position on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white flex flex-col font-sans selection:bg-[#FF3038]/30">
      {/* ─── Top Navbar ────────────────────────────────────────── */}
      <Navbar />

      {/* ─── Content Wrapper with Sidebar ──────────────────────── */}
      <div className="flex-1 flex pt-16">
        {/* Responsive Sidebar */}
        <Sidebar />

        {/* ─── Main Viewport Area ──────────────────────────────── */}
        <main
          className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
            isShortsPage ? 'pb-14 md:pb-0 h-[calc(100dvh-4rem)] overflow-hidden' : 'pb-20 md:pb-10'
          } ${
            // Left margin/padding matching sidebar state on desktop
            sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
          }`}
        >
          <div
            className={`w-full max-w-[2100px] mx-auto ${
              isShortsPage ? 'h-full p-0' : 'p-4 sm:p-6 lg:p-8'
            }`}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* ─── Real-Time Notification Toast ────────────────────── */}
      <NotificationToast />

      {/* ─── Mobile Bottom Navigation Bar ──────────────────────── */}
      <BottomNav />
    </div>
  );
}
