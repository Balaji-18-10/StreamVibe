import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flame, Film, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import VideoCard from '../components/video/VideoCard.jsx';
import VideoCardSkeleton from '../components/ui/VideoCardSkeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import { videoService } from '../services/index.js';

// Backend supported categories (matching Video.model.js enum)
const BACKEND_CATEGORIES = [
  'All',
  'Tech',
  'Gaming',
  'Music',
  'Education',
  'Entertainment',
  'Sports',
  'News',
  'Travel',
  'Food',
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [videos, setVideos] = useState([]);
  const [trendingVideos, setTrendingVideos] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    hasNext: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const activeCategoryRef = useRef(selectedCategory);
  activeCategoryRef.current = selectedCategory;

  // ─── 1. Fetch Trending Videos (Top 6) ────────────────────────
  const fetchTrending = useCallback(async () => {
    try {
      const res = await videoService.getTrending({ limit: 6 });
      if (res.data?.success) {
        setTrendingVideos(res.data.data?.videos || []);
      }
    } catch (err) {
      // Trending fetch failure does not break the main feed
      console.warn('Failed to load trending videos:', err.message);
    }
  }, []);

  // ─── 2. Fetch Main Video Feed ────────────────────────────────
  const fetchVideos = useCallback(
    async (pageToLoad = 1, isInitial = false) => {
      if (isInitial) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const params = {
          page: pageToLoad,
          limit: 12,
          sort: 'newest',
        };

        if (activeCategoryRef.current !== 'All') {
          params.category = activeCategoryRef.current;
        }

        const res = await videoService.getAll(params);

        if (res.data?.success) {
          const { videos: newVideos, pagination: meta } = res.data.data;

          if (pageToLoad === 1) {
            setVideos(newVideos || []);
          } else {
            // Append without duplicates
            setVideos((prev) => {
              const existingIds = new Set(prev.map((v) => v._id));
              const uniqueNew = (newVideos || []).filter((v) => !existingIds.has(v._id));
              return [...prev, ...uniqueNew];
            });
          }

          if (meta) {
            setPagination(meta);
          }
          setError(null);
        } else {
          throw new Error(res.data?.message || 'Failed to fetch videos.');
        }
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          'Unable to load videos. Please check your connection.';
        setError(errorMsg);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  // Initial mount: load trending & page 1
  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  // When category changes, reload from page 1
  useEffect(() => {
    fetchVideos(1, true);
  }, [selectedCategory, fetchVideos]);

  // Load more pagination handler
  const handleLoadMore = () => {
    if (!isLoadingMore && pagination.hasNext) {
      fetchVideos(pagination.page + 1, false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* ─── Category Filter Pills Bar ─────────────────────────────── */}
      <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-[#0B0B0F]/95 backdrop-blur-md border-b border-white/5 flex items-center gap-2 overflow-x-auto hide-scrollbar select-none">
        {BACKEND_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-[#FF3038] text-white shadow-md shadow-[#FF3038]/30 scale-[1.02]'
                  : 'bg-[#17171D] text-[#A1A1AA] hover:text-white hover:bg-[#202027] border border-[#23232C]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ─── Trending Videos Section (Shown on 'All' view) ─────────── */}
      {selectedCategory === 'All' && !error && trendingVideos.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FF3038]/15 border border-[#FF3038]/30 flex items-center justify-center text-[#FF3038]">
                <Flame className="w-4 h-4 fill-[#FF3038]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Trending Now
                  <Badge variant="accent">Top Weekly</Badge>
                </h2>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            {trendingVideos.map((video, idx) => (
              <div key={`trend-${video._id}`} className="relative group/rank">
                <VideoCard video={video} />
                {/* Ranking Tag */}
                <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-lg bg-black/80 backdrop-blur-sm text-white font-black text-xs flex items-center justify-center border border-white/10 shadow-lg pointer-events-none group-hover/rank:border-[#FF3038]/60 transition-colors">
                  #{idx + 1}
                </div>
              </div>
            ))}
          </div>

          <div className="w-full border-b border-white/5 pt-2" />
        </section>
      )}

      {/* ─── Main Video Feed Section ──────────────────────────────── */}
      <section className="flex flex-col gap-4">
        {selectedCategory !== 'All' && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{selectedCategory} Videos</span>
              {pagination.total > 0 && (
                <span className="text-xs text-[#A1A1AA] font-normal">
                  ({pagination.total} total)
                </span>
              )}
            </h2>
          </div>
        )}

        {/* Loading Initial Skeletons */}
        {isLoading && <VideoCardSkeleton count={10} />}

        {/* API Error State */}
        {!isLoading && error && (
          <ErrorState
            title="Failed to Load Video Feed"
            message={error}
            onRetry={() => fetchVideos(1, true)}
          />
        )}

        {/* Empty State */}
        {!isLoading && !error && videos.length === 0 && (
          <EmptyState
            icon={Film}
            title={
              selectedCategory === 'All'
                ? 'No videos available yet'
                : `No videos found in "${selectedCategory}"`
            }
            description="Be the first to upload content to this category or explore other topics!"
            actionLabel={selectedCategory !== 'All' ? 'Browse All Categories' : 'Upload Video'}
            onAction={
              selectedCategory !== 'All'
                ? () => setSelectedCategory('All')
                : undefined
            }
            actionTo={selectedCategory === 'All' ? '/upload' : undefined}
          />
        )}

        {/* Real Video Cards Grid */}
        {!isLoading && !error && videos.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
              {videos.map((video) => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>

            {/* Pagination / Load More */}
            {pagination.hasNext && (
              <div className="flex justify-center pt-8 pb-4">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleLoadMore}
                  isLoading={isLoadingMore}
                  className="px-8 border-[#23232C] hover:border-[#FF3038]/50"
                >
                  {isLoadingMore ? 'Loading More...' : 'Load More Videos'}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
