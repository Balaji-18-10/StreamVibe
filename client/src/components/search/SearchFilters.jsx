import React from 'react';
import { SlidersHorizontal, RotateCcw, Info, Film, User, Sparkles, Calendar, Eye } from 'lucide-react';

export default function SearchFilters({
  isOpen,
  onToggle,
  activeType = 'video',
  activeSort = 'relevance',
  onSelectType,
  onSelectSort,
  onResetFilters,
  hasActiveFilters = false,
}) {
  const typeOptions = [
    { id: 'video', label: 'Videos', icon: Film },
    { id: 'channel', label: 'Channels', icon: User },
  ];

  const sortOptions = [
    { id: 'relevance', label: 'Relevance', icon: Sparkles },
    { id: 'newest', label: 'Upload Date (Newest)', icon: Calendar },
    { id: 'popular', label: 'View Count (Most Viewed)', icon: Eye },
  ];

  return (
    <div className="w-full mb-6 border-b border-white/5 pb-4">
      {/* ─── Top Filter Toggle Bar ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            isOpen || hasActiveFilters
              ? 'bg-[#FF3038] text-white shadow-lg shadow-[#FF3038]/30'
              : 'bg-[#17171D] text-zinc-300 hover:text-white hover:bg-[#202028] border border-white/5'
          }`}
          aria-expanded={isOpen}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-white ml-0.5" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#FF3038] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* ─── Expandable Filters Panel ──────────────────────────── */}
      {isOpen && (
        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-[#17171D]/70 border border-white/5 flex flex-col gap-5 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* 1. Content Type Filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                Content Type
              </label>
              <div className="flex flex-wrap gap-2">
                {typeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = activeType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectType(opt.id)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-white text-black font-bold shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Sort By Filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                Sort By
              </label>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = activeSort === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectSort(opt.id)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-white text-black font-bold shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Backend Capabilities Note */}
          <div className="flex items-start gap-2 pt-3 border-t border-white/5 text-[11px] text-zinc-500">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <span>
              Real-time MongoDB text-score relevance, view count, and upload date sorting are supported.
              Category & Duration filter enhancements are scheduled for the next backend update.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
