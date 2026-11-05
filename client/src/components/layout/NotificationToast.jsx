import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, ExternalLink } from 'lucide-react';
import { useSocketStore } from '../../store/socketStore.js';
import Avatar from '../ui/Avatar.jsx';

export default function NotificationToast() {
  const navigate = useNavigate();
  const { activeToast, dismissToast } = useSocketStore();

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast, dismissToast]);

  if (!activeToast) return null;

  const handleClick = () => {
    if (activeToast.entityType === 'Video' && activeToast.entityId) {
      navigate(`/watch/${activeToast.entityId}`);
    } else if (activeToast.sender?.username) {
      navigate(`/@${activeToast.sender.username}`);
    }
    dismissToast();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-bounce-subtle">
      <div className="bg-[#17171D] border border-[#23232C] rounded-2xl p-4 shadow-2xl shadow-black/90 flex items-start gap-3 backdrop-blur-xl">
        {/* Left icon / avatar */}
        <div className="relative shrink-0 mt-0.5">
          <Avatar
            src={activeToast.sender?.avatar?.url || activeToast.sender?.avatar}
            name={activeToast.sender?.displayName || activeToast.sender?.username || 'StreamVibe'}
            size="sm"
          />
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#FF3038] rounded-full flex items-center justify-center text-white">
            <Bell className="w-2.5 h-2.5" />
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-xs font-bold text-white truncate">
              {activeToast.sender?.displayName || activeToast.sender?.username || 'New Notification'}
            </span>
            <span className="text-[10px] text-zinc-500 shrink-0">Just now</span>
          </div>
          <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
            {activeToast.message}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-[#FF3038] font-semibold mt-1.5 hover:underline">
            <span>View now</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={dismissToast}
          className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
          aria-label="Dismiss toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
