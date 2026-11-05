import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Flame,
  Tv2,
  Library,
  History,
  ListVideo,
  Clock,
  ThumbsUp,
  UserSquare2,
  LayoutDashboard,
  Settings,
  Compass,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore.js';
import { useAuthStore } from '../../store/authStore.js';

export default function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen } = useUIStore();
  const { user, isAuthenticated } = useAuthStore();

  const channelPath = isAuthenticated && user?.username ? `/@${user.username}` : '/login';

  const mainNav = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Shorts', path: '/shorts', icon: Flame },
    { name: 'Subscriptions', path: '/subscriptions', icon: Tv2 },
  ];

  const libraryNav = [
    { name: 'Library', path: '/library', icon: Library },
    { name: 'History', path: '/history', icon: History },
    { name: 'Playlists', path: '/playlists', icon: ListVideo },
    { name: 'Watch Later', path: '/playlists?tab=watch-later', icon: Clock },
    { name: 'Liked Videos', path: '/playlists?tab=liked', icon: ThumbsUp },
  ];

  const creatorNav = [
    { name: 'Your Channel', path: channelPath, icon: UserSquare2 },
    { name: 'Creator Studio', path: '/studio', icon: LayoutDashboard },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Helper to determine if link is active
  const isLinkActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path.split('?')[0]);
  };

  const renderExpandedSection = (title, items) => (
    <div className="py-2.5 border-b border-white/5 last:border-b-0">
      {title && (
        <h4 className="px-3.5 mb-1.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
          {title}
        </h4>
      )}
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isLinkActive(item.path);

          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => {
                // Auto-close on mobile screen
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                active
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  active ? 'text-[#FF3038]' : 'text-zinc-400 group-hover:text-white'
                }`}
              />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  const renderCollapsedSection = (items) => (
    <div className="flex flex-col gap-2 py-2">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isLinkActive(item.path);

        return (
          <NavLink
            key={item.name}
            to={item.path}
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium transition-all group ${
              active
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
            title={item.name}
          >
            <Icon
              className={`w-5 h-5 mb-1 transition-colors ${
                active ? 'text-[#FF3038]' : 'text-zinc-400 group-hover:text-white'
              }`}
            />
            <span className="truncate max-w-[56px] text-center">{item.name}</span>
          </NavLink>
        );
      })}
    </div>
  );

  return (
    <>
      {/* ─── Mobile Backdrop Overlay ─────────────────────────────── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
        />
      )}

      {/* ─── Sidebar Container ───────────────────────────────────── */}
      <aside
        className={`fixed top-16 bottom-0 left-0 bg-[#0B0B0F] border-r border-[#23232C]/80 z-40 overflow-y-auto transition-all duration-300 ease-in-out select-none ${
          // Mobile: slide in/out
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop: expanded or mini
          sidebarCollapsed ? 'lg:w-[72px] px-1' : 'w-60 lg:w-64 px-3'
        }`}
      >
        <div className="py-2">
          {sidebarCollapsed ? (
            // Collapsed view (icons + small label)
            <>
              {renderCollapsedSection(mainNav)}
              <div className="w-8 mx-auto my-1 border-t border-white/5" />
              {renderCollapsedSection([
                libraryNav[0], // History
                libraryNav[1], // Playlists
                creatorNav[1], // Studio
              ])}
            </>
          ) : (
            // Expanded view
            <>
              {renderExpandedSection(null, mainNav)}
              {renderExpandedSection('Library', libraryNav)}
              {renderExpandedSection('Explore & Creator', creatorNav)}

              {/* Footer info in sidebar */}
              <div className="pt-6 pb-4 px-3 text-[11px] text-zinc-500 leading-relaxed border-t border-white/5 mt-4">
                <p className="font-semibold text-zinc-400 mb-1">StreamVibe © 2026</p>
                <p>Next-Gen Video Platform</p>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
