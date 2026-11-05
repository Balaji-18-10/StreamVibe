import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Bell,
  BellRing,
  BellOff,
  Check,
  Search,
  Grid,
  List,
  Sparkles,
  ExternalLink,
  Flame,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import Avatar from '../components/ui/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import { subscriptionService } from '../services/index.js';
import { formatViews } from '../utils/formatters.js';

export default function Subscriptions() {
  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [activeDropdownChannelId, setActiveDropdownChannelId] = useState(null);
  const [updatingChannelId, setUpdatingChannelId] = useState(null);

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await subscriptionService.getSubscribed({ limit: 100 });
      if (res.data?.success) {
        setChannels(res.data.data.channels || []);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
      setError(err.response?.data?.message || 'Could not load your subscribed channels.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Handle Unsubscribe
  const handleUnsubscribe = async (channelId) => {
    setUpdatingChannelId(channelId);
    try {
      const res = await subscriptionService.toggle(channelId);
      if (res.data?.success) {
        setChannels((prev) => prev.filter((c) => String(c._id) !== String(channelId)));
      }
    } catch (err) {
      console.error('Unsubscribe error:', err);
    } finally {
      setUpdatingChannelId(null);
    }
  };

  // Handle Notification Preference Change
  const handleNotificationChange = async (channelId, level) => {
    setActiveDropdownChannelId(null);
    try {
      const res = await subscriptionService.updateNotification(channelId, level);
      if (res.data?.success) {
        setChannels((prev) =>
          prev.map((c) =>
            String(c._id) === String(channelId) ? { ...c, notificationLevel: level } : c
          )
        );
      }
    } catch (err) {
      console.error('Failed to update notification preference:', err);
    }
  };

  // Filter channels by query
  const filteredChannels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter(
      (c) =>
        c.displayName?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q) ||
        c.bio?.toLowerCase().includes(q)
    );
  }, [channels, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto py-2">
      {/* ─── Header Section ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#17171D] border border-white/10 flex items-center justify-center text-[#FF3038] shadow-inner shadow-black/60">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Subscriptions</span>
              {!isLoading && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                  {channels.length} {channels.length === 1 ? 'channel' : 'channels'}
                </span>
              )}
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage your channel subscriptions and real-time notification alerts
            </p>
          </div>
        </div>

        {/* Search & Layout Controls */}
        <div className="flex items-center gap-3">
          {/* Channel search input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#17171D] border border-[#23232C] focus:border-[#FF3038] focus:ring-1 focus:ring-[#FF3038] text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-3 py-2 outline-none transition-colors"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#17171D] border border-[#23232C] rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content ──────────────────────────────────────── */}
      {isLoading ? (
        /* Loading Skeletons */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-[#17171D] border border-[#23232C] rounded-3xl p-5 flex items-center gap-4"
            >
              <Skeleton className="w-16 h-16 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-xl mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load subscriptions"
          message={error}
          onRetry={fetchSubscriptions}
        />
      ) : channels.length === 0 ? (
        /* Empty State: No Subscriptions */
        <div className="bg-[#17171D]/60 border border-[#23232C] rounded-3xl p-12 text-center max-w-xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF3038] mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No subscriptions yet</h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
            Subscribe to your favorite creators to never miss new videos, live streams, and channel
            updates.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              to="/"
              variant="primary"
              size="md"
              leftIcon={Flame}
              className="rounded-full shadow-lg shadow-[#FF3038]/30 px-6"
            >
              Explore Trending Videos
            </Button>
          </div>
        </div>
      ) : filteredChannels.length === 0 ? (
        /* Empty State: Search Query Yielded No Matches */
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-400">
            No subscribed channels matching &quot;{searchQuery}&quot;
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs text-[#FF3038] hover:underline font-semibold mt-2 inline-block"
          >
            Clear search filter
          </button>
        </div>
      ) : (
        /* Channel Listings */
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5'
              : 'flex flex-col gap-3'
          }
        >
          {filteredChannels.map((channel) => (
            <div
              key={channel._id}
              className={`bg-[#17171D] border border-[#23232C] hover:border-white/10 rounded-3xl transition-all duration-200 group relative ${
                viewMode === 'grid'
                  ? 'p-5 flex flex-col justify-between'
                  : 'p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4'
              }`}
            >
              {/* Channel Info */}
              <div
                className={`flex items-start gap-4 ${
                  viewMode === 'grid' ? 'mb-4' : 'flex-1 min-w-0'
                }`}
              >
                <Link to={`/@${channel.username}`} className="shrink-0 group/avatar">
                  <Avatar
                    src={channel.avatar?.url || channel.avatar}
                    name={channel.displayName || channel.username}
                    size={viewMode === 'grid' ? 'lg' : 'md'}
                    border
                    className="group-hover/avatar:ring-2 ring-[#FF3038] transition-all"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/@${channel.username}`}
                    className="text-sm font-bold text-white hover:text-[#FF3038] transition-colors truncate block"
                  >
                    {channel.displayName || channel.username}
                  </Link>
                  <p className="text-xs text-zinc-400 truncate">@{channel.username}</p>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                    <span>{formatViews(channel.subscriberCount || 0).replace('views', 'subscribers')}</span>
                    {typeof channel.videoCount === 'number' && (
                      <>
                        <span>•</span>
                        <span>{channel.videoCount} videos</span>
                      </>
                    )}
                  </div>

                  {channel.bio && (
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                      {channel.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Section: Subscribed Button & Notification Bell */}
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 justify-end">
                {/* Channel Link */}
                <Link
                  to={`/@${channel.username}`}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                  title="Visit Channel"
                  aria-label="Visit Channel"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>

                {/* Notification Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveDropdownChannelId((prev) =>
                        prev === channel._id ? null : channel._id
                      )
                    }
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                    title="Notification settings"
                    aria-label="Notification settings"
                  >
                    {channel.notificationLevel === 'all' ? (
                      <BellRing className="w-4 h-4 text-[#FF3038]" />
                    ) : channel.notificationLevel === 'none' ? (
                      <BellOff className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <Bell className="w-4 h-4 text-white" />
                    )}
                  </button>

                  {/* Notification Level Popup */}
                  {activeDropdownChannelId === channel._id && (
                    <div className="absolute right-0 bottom-12 sm:bottom-auto sm:top-12 w-44 bg-[#1E1E26] border border-[#2B2B36] rounded-2xl shadow-2xl shadow-black/90 p-1.5 z-50 animate-fade-in backdrop-blur-xl">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/5 mb-1">
                        Alerts
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNotificationChange(channel._id, 'all')}
                        className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between text-left transition-colors ${
                          channel.notificationLevel === 'all'
                            ? 'text-[#FF3038] font-bold bg-white/5'
                            : 'text-zinc-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BellRing className="w-3.5 h-3.5" />
                          <span>All</span>
                        </div>
                        {channel.notificationLevel === 'all' && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNotificationChange(channel._id, 'highlights')}
                        className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between text-left transition-colors ${
                          channel.notificationLevel === 'highlights'
                            ? 'text-[#FF3038] font-bold bg-white/5'
                            : 'text-zinc-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Bell className="w-3.5 h-3.5" />
                          <span>Personalized</span>
                        </div>
                        {channel.notificationLevel === 'highlights' && (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNotificationChange(channel._id, 'none')}
                        className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between text-left transition-colors ${
                          channel.notificationLevel === 'none'
                            ? 'text-[#FF3038] font-bold bg-white/5'
                            : 'text-zinc-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BellOff className="w-3.5 h-3.5" />
                          <span>None</span>
                        </div>
                        {channel.notificationLevel === 'none' && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Unsubscribe Button */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUnsubscribe(channel._id)}
                  isLoading={updatingChannelId === channel._id}
                  disabled={updatingChannelId === channel._id}
                  leftIcon={UserCheck}
                  className="rounded-xl border border-white/10 hover:border-red-500/50 hover:text-red-400 transition-colors"
                >
                  Subscribed
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
