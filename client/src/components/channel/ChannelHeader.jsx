import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellRing,
  BellOff,
  Check,
  Plus,
  Share2,
  ExternalLink,
  Globe,
  Twitter,
  Instagram,
  Settings,
  LayoutDashboard,
  Calendar,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import Button from '../ui/Button.jsx';
import { formatViews } from '../../utils/formatters.js';
import { subscriptionService } from '../../services/index.js';
import { useAuthStore } from '../../store/authStore.js';

export default function ChannelHeader({
  channel,
  isOwner = false,
  onOpenAboutTab,
}) {
  const { user, isAuthenticated } = useAuthStore();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(channel.subscriberCount || 0);
  const [notificationLevel, setNotificationLevel] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bellDropdownOpen, setBellDropdownOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  const bellMenuRef = useRef(null);
  const channelId = channel._id;

  // ─── 1. Fetch Subscription & Notification Status ────────────
  useEffect(() => {
    setSubCount(channel.subscriberCount || 0);

    if (!isAuthenticated || !channelId || isOwner) {
      setIsSubscribed(false);
      return;
    }

    subscriptionService
      .getStatus(channelId)
      .then((res) => {
        if (res.data?.success) {
          const sub = Boolean(res.data.data.subscribed ?? res.data.data.isSubscribed);
          setIsSubscribed(sub);
          if (res.data.data.notificationLevel) {
            setNotificationLevel(res.data.data.notificationLevel);
          }
        }
      })
      .catch(() => {});
  }, [channelId, isAuthenticated, isOwner, channel.subscriberCount]);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (bellMenuRef.current && !bellMenuRef.current.contains(e.target)) {
        setBellDropdownOpen(false);
      }
    };
    if (bellDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [bellDropdownOpen]);

  // ─── 2. Subscribe / Unsubscribe Toggle ──────────────────────
  const handleSubscribeToggle = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to subscribe to this channel.');
      return;
    }
    if (isOwner || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await subscriptionService.toggle(channelId);
      if (res.data?.success) {
        const nextSubscribed = Boolean(res.data.data.subscribed ?? res.data.data.isSubscribed);
        setIsSubscribed(nextSubscribed);
        setSubCount(
          typeof res.data.data.subscriberCount === 'number'
            ? res.data.data.subscriberCount
            : nextSubscribed
            ? subCount + 1
            : Math.max(0, subCount - 1)
        );
        if (nextSubscribed) {
          setNotificationLevel('all');
        }
      }
    } catch (err) {
      console.warn('Subscription error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 3. Update Notification Level ───────────────────────────
  const handleUpdateNotification = async (level) => {
    try {
      setNotificationLevel(level);
      setBellDropdownOpen(false);
      await subscriptionService.updateNotification(channelId, level);
    } catch (err) {
      console.warn('Notification level error:', err);
    }
  };

  // ─── 4. Share Channel ───────────────────────────────────────
  const handleShare = async () => {
    const channelUrl = `${window.location.origin}/@${channel.username}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: channel.displayName || channel.username,
          text: `Check out ${channel.displayName || channel.username} on StreamVibe!`,
          url: channelUrl,
        });
      } catch {
        // Ignored if user cancels share dialog
      }
    } else {
      navigator.clipboard.writeText(channelUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const defaultBanner =
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2000&auto=format&fit=crop&q=80';
  const bannerUrl =
    !bannerError && channel.banner?.url ? channel.banner.url : defaultBanner;

  return (
    <div className="w-full flex flex-col mb-4">
      {/* ─── Channel Banner ────────────────────────────────────── */}
      <div className="relative w-full h-36 sm:h-52 md:h-64 lg:h-72 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#17171D] border border-white/5 shadow-inner">
        <img
          src={bannerUrl}
          alt={`${channel.displayName} banner`}
          onError={() => setBannerError(true)}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F]/70 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* ─── Profile Info Bar ──────────────────────────────────── */}
      <div className="px-2 sm:px-4 flex flex-col md:flex-row md:items-end justify-between gap-5 -mt-12 sm:-mt-16 md:-mt-20 z-10">
        {/* Left: Avatar & Text Metadata */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 text-center sm:text-left">
          {/* Avatar with Ring */}
          <div className="shrink-0 relative">
            <Avatar
              src={channel.avatar?.url || channel.avatar}
              name={channel.displayName || channel.username}
              size="xl"
              className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full ring-4 sm:ring-8 ring-[#0B0B0F] shadow-2xl bg-[#17171D] object-cover"
            />
          </div>

          {/* Titles & Meta */}
          <div className="flex flex-col gap-1 sm:gap-1.5 pt-2">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {channel.displayName || channel.username}
              </h1>
              <ShieldCheck className="w-5 h-5 text-[#FF3038] shrink-0" title="Verified Creator" />
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs sm:text-sm text-zinc-400 font-medium">
              <span className="text-white font-semibold">@{channel.username}</span>
              <span>•</span>
              <span>{formatViews(subCount).replace('views', 'subscribers')}</span>
              <span>•</span>
              <span>{channel.videoCount || 0} {channel.videoCount === 1 ? 'video' : 'videos'}</span>
            </div>

            {/* Expandable Bio Snippet */}
            {channel.bio && (
              <div className="mt-1 flex items-center justify-center sm:justify-start gap-1 max-w-xl">
                <p className="text-xs text-zinc-400 line-clamp-1 leading-relaxed">
                  {channel.bio}
                </p>
                <button
                  type="button"
                  onClick={onOpenAboutTab}
                  className="text-xs font-semibold text-white hover:text-[#FF3038] transition-colors shrink-0 flex items-center"
                >
                  more <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Links preview row */}
            {channel.links && Object.values(channel.links).some(Boolean) && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1.5 text-xs text-zinc-400">
                {channel.links.website && (
                  <a
                    href={channel.links.website.startsWith('http') ? channel.links.website : `https://${channel.links.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-[#FF3038] transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Website</span>
                  </a>
                )}
                {channel.links.twitter && (
                  <a
                    href={`https://twitter.com/${channel.links.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-[#FF3038] transition-colors"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                    <span>Twitter</span>
                  </a>
                )}
                {channel.links.instagram && (
                  <a
                    href={`https://instagram.com/${channel.links.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-[#FF3038] transition-colors"
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>Instagram</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions Row */}
        <div className="flex items-center justify-center sm:justify-end gap-2.5 shrink-0 pt-2 md:pt-0">
          {isOwner ? (
            /* ─── Channel Owner Controls ─────────────────────────── */
            <div className="flex items-center gap-2.5">
              <Link to="/settings">
                <Button variant="secondary" size="sm" leftIcon={Settings}>
                  Customize Channel
                </Button>
              </Link>
              <Link to="/studio">
                <Button variant="primary" size="sm" leftIcon={LayoutDashboard}>
                  Creator Studio
                </Button>
              </Link>
            </div>
          ) : (
            /* ─── Visitor Subscribe & Notification ──────────────── */
            <div className="flex items-center gap-2 relative">
              <Button
                variant={isSubscribed ? 'secondary' : 'primary'}
                size="md"
                onClick={handleSubscribeToggle}
                disabled={isSubmitting}
                leftIcon={isSubscribed ? Check : Plus}
                className={
                  isSubscribed
                    ? 'bg-white/10 hover:bg-white/20 text-white rounded-full'
                    : 'rounded-full shadow-lg shadow-[#FF3038]/30 px-6'
                }
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>

              {/* Notification Preferences Bell Dropdown */}
              {isSubscribed && (
                <div className="relative" ref={bellMenuRef}>
                  <button
                    type="button"
                    onClick={() => setBellDropdownOpen((prev) => !prev)}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center"
                    title="Notification preferences"
                    aria-label="Notification preferences"
                  >
                    {notificationLevel === 'all' ? (
                      <BellRing className="w-4 h-4 text-[#FF3038]" />
                    ) : notificationLevel === 'none' ? (
                      <BellOff className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <Bell className="w-4 h-4 text-white" />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {bellDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-[#17171D] border border-[#23232C] rounded-2xl shadow-2xl shadow-black/80 py-1.5 z-50 animate-fade-in backdrop-blur-xl">
                      <div className="px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 border-b border-white/5">
                        Notifications
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateNotification('all')}
                        className={`w-full px-3.5 py-2.5 text-xs flex items-center justify-between text-left transition-colors ${
                          notificationLevel === 'all'
                            ? 'text-[#FF3038] font-bold bg-white/5'
                            : 'text-zinc-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BellRing className="w-4 h-4" />
                          <span>All</span>
                        </div>
                        {notificationLevel === 'all' && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateNotification('highlights')}
                        className={`w-full px-3.5 py-2.5 text-xs flex items-center justify-between text-left transition-colors ${
                          notificationLevel === 'highlights'
                            ? 'text-[#FF3038] font-bold bg-white/5'
                            : 'text-zinc-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          <span>Personalized</span>
                        </div>
                        {notificationLevel === 'highlights' && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateNotification('none')}
                        className={`w-full px-3.5 py-2.5 text-xs flex items-center justify-between text-left transition-colors ${
                          notificationLevel === 'none'
                            ? 'text-[#FF3038] font-bold bg-white/5'
                            : 'text-zinc-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BellOff className="w-4 h-4" />
                          <span>None</span>
                        </div>
                        {notificationLevel === 'none' && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
            title={shareCopied ? 'Copied link!' : 'Share Channel'}
            aria-label="Share Channel"
          >
            {shareCopied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
