import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Flame, Plus, Tv2, Library, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

export default function BottomNav() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  const isLinkActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Shorts', path: '/shorts', icon: Flame },
    // Center Upload Button
    { name: 'Create', path: '/upload', isUpload: true },
    { name: 'Subscriptions', path: '/subscriptions', icon: Tv2 },
    {
      name: isAuthenticated ? 'Library' : 'Sign In',
      path: isAuthenticated ? '/library' : '/login',
      icon: isAuthenticated ? Library : User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0B0B0F]/95 backdrop-blur-lg border-t border-[#23232C] z-40 md:hidden px-3 flex items-center justify-around select-none">
      {navItems.map((item) => {
        if (item.isUpload) {
          return (
            <NavLink
              key="upload"
              to={item.path}
              className="relative -top-2 flex flex-col items-center justify-center group"
              aria-label="Upload video"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF3038] to-[#FF5252] text-white flex items-center justify-center shadow-lg shadow-[#FF3038]/30 group-active:scale-95 transition-transform duration-200">
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Create</span>
            </NavLink>
          );
        }

        const Icon = item.icon;
        const active = isLinkActive(item.path);

        return (
          <NavLink
            key={item.name}
            to={item.path}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
              active ? 'text-[#FF3038]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${active ? 'text-[#FF3038]' : 'text-zinc-400'}`} />
            <span
              className={`text-[10px] font-medium tracking-tight ${
                active ? 'text-white font-semibold' : 'text-zinc-400'
              }`}
            >
              {item.name}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
