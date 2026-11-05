import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import Button from '../ui/Button.jsx';
import { formatViews } from '../../utils/formatters.js';
import { subscriptionService } from '../../services/index.js';
import { useAuthStore } from '../../store/authStore.js';

export default function SearchResultChannelCard({ channel }) {
  const { user, isAuthenticated } = useAuthStore();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(channel.subscriberCount || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const channelId = channel._id || channel.id;
  const isOwner = user?._id && String(user._id) === String(channelId);

  useEffect(() => {
    if (!isAuthenticated || !channelId || isOwner) return;

    subscriptionService
      .getStatus(channelId)
      .then((res) => {
        if (res.data?.success) {
          setIsSubscribed(Boolean(res.data.data.subscribed ?? res.data.data.isSubscribed));
        }
      })
      .catch(() => {});
  }, [isAuthenticated, channelId, isOwner]);

  const handleSubscribeToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert('Please sign in to subscribe.');
      return;
    }
    if (isOwner || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await subscriptionService.toggle(channelId);
      if (res.data?.success) {
        const nextSubscribed = Boolean(res.data.data.subscribed ?? res.data.data.isSubscribed);
        setIsSubscribed(nextSubscribed);
        setSubCount((prev) => (nextSubscribed ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch (err) {
      console.warn('Subscription toggle error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarUrl = channel.avatar?.url || channel.avatar || '';
  const displayName = channel.displayName || channel.username || 'Channel';
  const username = channel.username || 'channel';
  const bio = channel.bio || '';

  return (
    <article className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 w-full p-4 sm:p-6 rounded-2xl bg-[#17171D]/60 hover:bg-[#17171D] border border-white/5 transition-all">
      <Link
        to={`/@${username}`}
        className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 flex-1 min-w-0 text-center sm:text-left group"
      >
        {/* Large Channel Avatar */}
        <Avatar
          src={avatarUrl}
          name={displayName}
          size="lg"
          className="w-20 h-20 sm:w-28 sm:h-28 ring-4 ring-white/5 group-hover:ring-[#FF3038]/40 transition-all shrink-0"
        />

        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-xl font-bold text-white group-hover:text-[#FF3038] transition-colors truncate">
            {displayName}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mb-2">
            @{username} • {formatViews(subCount).replace('views', 'subscribers')}
          </p>
          {bio && (
            <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed max-w-xl">
              {bio}
            </p>
          )}
        </div>
      </Link>

      {/* Subscribe Button */}
      {!isOwner && (
        <div className="shrink-0 pt-1">
          <Button
            variant={isSubscribed ? 'secondary' : 'primary'}
            size="md"
            onClick={handleSubscribeToggle}
            disabled={isSubmitting}
            leftIcon={isSubscribed ? Check : Plus}
            className={
              isSubscribed
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'shadow-lg shadow-[#FF3038]/20'
            }
          >
            {isSubscribed ? 'Subscribed' : 'Subscribe'}
          </Button>
        </div>
      )}
    </article>
  );
}
