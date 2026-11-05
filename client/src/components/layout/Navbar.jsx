import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  X,
  Upload,
  Bell,
  User,
  Settings,
  LayoutDashboard,
  LogOut,
  Library,
  History,
  Tv2,
  CheckCheck,
  Check,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import Button from '../ui/Button.jsx';
import Avatar from '../ui/Avatar.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import { searchService } from '../../services/index.js';
import { formatTimeAgo } from '../../utils/formatters.js';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, accessToken, isAuthenticated, logout } = useAuthStore();
  const { toggleSidebar, sidebarCollapsed, collapseSidebar } = useUIStore();
  const {
    unreadCount,
    notifications,
    isLoadingNotifications,
    connect,
    disconnect,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useSocketStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all');

  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);
  const searchContainerRef = useRef(null);
  const mobileSearchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Connect socket and fetch notifications for authenticated user
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect(accessToken);
      fetchNotifications();
    } else {
      disconnect();
    }
  }, [isAuthenticated, accessToken, connect, disconnect, fetchNotifications]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setNotifMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Synchronize searchQuery with URL on search page
  useEffect(() => {
    if (location.pathname === '/search') {
      const params = new URLSearchParams(location.search);
      const q = params.get('q');
      if (q !== null && q !== searchQuery) {
        setSearchQuery(q);
      }
    }
  }, [location.pathname, location.search]);

  // Fetch search suggestions debounced
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await searchService.suggestions(trimmed);
        if (res.data?.success && Array.isArray(res.data.data?.suggestions)) {
          setSuggestions(res.data.data.suggestions);
          setShowSuggestions(res.data.data.suggestions.length > 0);
          setActiveSuggestionIdx(-1);
        }
      } catch {
        // Silently ignore suggestions errors
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close menus when route changes
  useEffect(() => {
    setUserMenuOpen(false);
    setNotifMenuOpen(false);
    setMobileSearchOpen(false);
    setShowSuggestions(false);
  }, [location.pathname]);

  const executeSearch = (rawQuery) => {
    const trimmed = (rawQuery ?? searchQuery).trim();
    if (!trimmed || trimmed.length < 2) return;

    setShowSuggestions(false);
    setMobileSearchOpen(false);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (activeSuggestionIdx >= 0 && suggestions[activeSuggestionIdx]) {
      executeSearch(suggestions[activeSuggestionIdx]);
    } else {
      executeSearch(searchQuery);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/');
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
    setNotifMenuOpen(false);

    if (notif.entityType === 'Video' && notif.entityId) {
      navigate(`/watch/${notif.entityId}`);
    } else if (notif.sender?.username) {
      navigate(`/@${notif.sender.username}`);
    }
  };

  const displayedNotifications = (notifications || []).filter((n) => {
    if (notifFilter === 'unread') return !n.isRead;
    return true;
  });

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0B0B0F]/95 backdrop-blur-md border-b border-[#23232C]/80 z-40 px-3 sm:px-6 flex items-center justify-between">
      {/* ─── Left Section: Hamburger & Brand Logo ────────────────── */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          to="/"
          className="flex items-center gap-2.5 group select-none"
          aria-label="StreamVibe Home"
        >
          {/* Custom StreamVibe Play/Wave Icon */}
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF3038] to-[#FF6067] flex items-center justify-center shadow-md shadow-[#FF3038]/30 group-hover:scale-105 transition-transform duration-200">
            <svg
              className="w-4 h-4 text-white fill-current ml-0.5"
              viewBox="0 0 24 24"
            >
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-ping opacity-75" />
          </div>

          <div className="flex flex-col">
            <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center">
              Stream
              <span className="text-[#FF3038] ml-0.5">Vibe</span>
            </span>
          </div>
        </Link>
      </div>

      {/* ─── Middle Section: Search Bar (Desktop) ─────────────────── */}
      <div className="hidden md:flex flex-1 max-w-xl mx-6 relative" ref={searchContainerRef}>
        <form onSubmit={handleSearchSubmit} className="w-full relative flex items-center">
          <div className="relative w-full flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search videos, creators, topics..."
              className="w-full bg-[#17171D] border border-[#23232C] text-white placeholder-zinc-500 text-sm rounded-l-2xl py-2.5 pl-4 pr-10 outline-none focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="absolute right-3 p-1 rounded-full text-zinc-400 hover:text-white transition-colors"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#202027] hover:bg-[#282832] text-zinc-300 hover:text-white border border-l-0 border-[#23232C] rounded-r-2xl transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Desktop Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1.5 bg-[#17171D] border border-[#23232C] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 py-1.5 backdrop-blur-xl animate-fade-in"
            role="listbox"
          >
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSearchQuery(item);
                  executeSearch(item);
                }}
                className={`px-4 py-2.5 flex items-center gap-3 text-sm cursor-pointer transition-colors ${
                  idx === activeSuggestionIdx
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
                role="option"
                aria-selected={idx === activeSuggestionIdx}
              >
                <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Mobile Search Overlay ───────────────────────────────── */}
      {mobileSearchOpen && (
        <div
          ref={mobileSearchContainerRef}
          className="absolute inset-0 bg-[#0B0B0F] px-4 flex flex-col justify-center z-50 md:hidden animate-fade-in"
        >
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen(false);
                setShowSuggestions(false);
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 shrink-0"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </button>
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 relative">
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search videos, creators..."
                className="w-full bg-[#17171D] border border-[#23232C] text-white placeholder-zinc-500 text-sm rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[#FF3038]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-20 p-1 text-zinc-400 hover:text-white"
                  aria-label="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <Button variant="primary" size="sm" type="submit" className="shrink-0">
                Search
              </Button>
            </form>
          </div>

          {/* Mobile Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className="mt-2 w-full bg-[#17171D] border border-[#23232C] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto"
              role="listbox"
            >
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearchQuery(item);
                    executeSearch(item);
                  }}
                  className="px-4 py-2 flex items-center gap-3 text-xs text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer truncate"
                  role="option"
                >
                  <Search className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Right Section: Actions & Profile ────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Search Toggle */}
        <button
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Open search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Create / Upload Button */}
        <Button
          variant="secondary"
          size="sm"
          to="/upload"
          leftIcon={Upload}
          className="hidden sm:inline-flex border-[#23232C] hover:border-[#FF3038]/40"
        >
          Create
        </Button>

        {/* Mobile quick upload button */}
        <Link
          to="/upload"
          className="sm:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Upload video"
        >
          <Upload className="w-5 h-5" />
        </Link>

        {/* Notifications Dropdown */}
        {isAuthenticated && (
          <div className="relative" ref={notifMenuRef}>
            <button
              type="button"
              onClick={() => setNotifMenuOpen((prev) => !prev)}
              className="relative p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-[#FF3038] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md shadow-[#FF3038]/40 animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {notifMenuOpen && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 bg-[#17171D] border border-[#23232C] rounded-2xl p-4 shadow-2xl shadow-black/80 z-50 animate-fade-in backdrop-blur-md">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#FF3038] text-white rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllAsRead()}
                      className="text-xs text-[#FF3038] hover:text-[#ff4f56] font-medium flex items-center gap-1 transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2 py-2.5 border-b border-white/5">
                  <button
                    type="button"
                    onClick={() => setNotifFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      notifFilter === 'all'
                        ? 'bg-[#FF3038] text-white'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifFilter('unread')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      notifFilter === 'unread'
                        ? 'bg-[#FF3038] text-white'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Unread {unreadCount > 0 && `(${unreadCount})`}
                  </button>
                </div>

                {/* Notification Items */}
                <div className="max-h-80 overflow-y-auto py-2 flex flex-col gap-1 divide-y divide-white/5">
                  {isLoadingNotifications ? (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      Loading notifications...
                    </div>
                  ) : displayedNotifications.length > 0 ? (
                    displayedNotifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`pt-2 p-2.5 rounded-xl transition-all flex items-start gap-3 group relative cursor-pointer ${
                          !notif.isRead ? 'bg-white/[0.04] hover:bg-white/[0.08]' : 'hover:bg-white/5'
                        }`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <Avatar
                          src={notif.sender?.avatar?.url || notif.sender?.avatar}
                          name={notif.sender?.displayName || notif.sender?.username || 'StreamVibe'}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-semibold text-white truncate">
                              {notif.sender?.displayName || notif.sender?.username || 'StreamVibe'}
                            </span>
                            {!notif.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3038] shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-300 leading-snug line-clamp-2">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-zinc-500 mt-1 inline-block">
                            {formatTimeAgo(notif.createdAt)}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notif.isRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notif._id);
                              }}
                              className="p-1 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-white/10"
                              title="Mark as read"
                              aria-label="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif._id);
                            }}
                            className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/10"
                            title="Delete notification"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      {notifFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <Link
                    to="/subscriptions"
                    onClick={() => setNotifMenuOpen(false)}
                    className="text-xs text-[#FF3038] hover:underline font-medium"
                  >
                    Subscriptions & Alerts
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setNotifMenuOpen(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Settings
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Profile Menu or Sign In */}
        {isAuthenticated && user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-[#FF3038]/50 transition-all select-none cursor-pointer"
              aria-label="User account menu"
            >
              <Avatar
                src={user.avatar?.url || user.avatar}
                name={user.displayName || user.username}
                size="sm"
                border
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-12 w-64 bg-[#17171D] border border-[#23232C] rounded-2xl p-2 shadow-2xl shadow-black/80 z-50 animate-fade-in backdrop-blur-md divide-y divide-white/5">
                {/* Profile header */}
                <div className="px-3 py-2.5">
                  <p className="text-sm font-bold text-white truncate">
                    {user.displayName || user.username}
                  </p>
                  <p className="text-xs text-[#A1A1AA] truncate">@{user.username}</p>
                </div>

                {/* Nav Links */}
                <div className="py-1.5 flex flex-col gap-0.5">
                  <Link
                    to={`/@${user.username}`}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <Tv2 className="w-4 h-4 text-zinc-400" />
                    <span>Your Channel</span>
                  </Link>
                  <Link
                    to="/studio"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-zinc-400" />
                    <span>Creator Studio</span>
                  </Link>
                  <Link
                    to="/playlists"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <Library className="w-4 h-4 text-zinc-400" />
                    <span>Playlists</span>
                  </Link>
                  <Link
                    to="/history"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <History className="w-4 h-4 text-zinc-400" />
                    <span>History</span>
                  </Link>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-[#FF3038] hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#FF3038]" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}
                  <Link
                    to="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <Settings className="w-4 h-4 text-zinc-400" />
                    <span>Settings</span>
                  </Link>
                </div>

                {/* Sign Out */}
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            to="/login"
            leftIcon={User}
            className="rounded-full font-semibold"
          >
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
