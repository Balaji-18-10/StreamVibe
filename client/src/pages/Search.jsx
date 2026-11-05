import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon,
  SearchX,
  Loader2,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import SearchResultVideoCard from '../components/search/SearchResultVideoCard.jsx';
import SearchResultChannelCard from '../components/search/SearchResultChannelCard.jsx';
import SearchFilters from '../components/search/SearchFilters.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Button from '../components/ui/Button.jsx';
import { searchService } from '../services/index.js';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'video';
  const sort = searchParams.get('sort') || 'relevance';

  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
    hasNext: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const abortControllerRef = useRef(null);

  // ─── 1. Perform Search on Query / Filter Change ─────────────
  const performSearch = useCallback(
    async (searchQuery, searchType, searchSort) => {
      const trimmed = searchQuery.trim();
      if (!trimmed || trimmed.length < 2) {
        setResults([]);
        setPagination({ page: 1, limit: 15, total: 0, totalPages: 1, hasNext: false });
        setIsLoading(false);
        setError(null);
        return;
      }

      // Cancel any ongoing stale request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const res = await searchService.search(
          {
            q: trimmed,
            type: searchType,
            sort: searchSort,
            page: 1,
            limit: 15,
          },
          { signal: controller.signal }
        );

        if (res.data?.success) {
          setResults(res.data.data?.results || []);
          setPagination(
            res.data.data?.pagination || {
              page: 1,
              limit: 15,
              total: 0,
              totalPages: 1,
              hasNext: false,
            }
          );
        }
      } catch (err) {
        // Ignore aborted request errors
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }
        console.error('Search request error:', err);
        setError(
          err.response?.data?.message || 'Failed to fetch search results. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    performSearch(query, type, sort);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, type, sort, performSearch]);

  // ─── 2. Load More Pagination ────────────────────────────────
  const handleLoadMore = async () => {
    if (isLoadingMore || !pagination.hasNext) return;

    setIsLoadingMore(true);
    try {
      const nextPage = pagination.page + 1;
      const res = await searchService.search({
        q: query.trim(),
        type,
        sort,
        page: nextPage,
        limit: 15,
      });

      if (res.data?.success) {
        const newResults = res.data.data?.results || [];
        setResults((prev) => {
          const existingIds = new Set(prev.map((item) => item._id));
          const uniqueItems = newResults.filter((item) => !existingIds.has(item._id));
          return [...prev, ...uniqueItems];
        });
        setPagination(
          res.data.data?.pagination || {
            page: nextPage,
            limit: 15,
            total: pagination.total,
            totalPages: pagination.totalPages,
            hasNext: false,
          }
        );
      }
    } catch (err) {
      console.warn('Load more search results error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // ─── 3. Filter Actions ──────────────────────────────────────
  const handleSelectType = (newType) => {
    const next = new URLSearchParams(searchParams);
    if (newType === 'video') {
      next.delete('type');
    } else {
      next.set('type', newType);
    }
    setSearchParams(next);
  };

  const handleSelectSort = (newSort) => {
    const next = new URLSearchParams(searchParams);
    if (newSort === 'relevance') {
      next.delete('sort');
    } else {
      next.set('sort', newSort);
    }
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    setSearchParams(next);
  };

  const hasActiveFilters = type !== 'video' || sort !== 'relevance';

  // Quick suggestions for invalid/empty query state
  const sampleTopics = ['Streaming Architecture', 'Unreal Engine', 'Raytracing', 'Music', 'Tech', 'Cyberpunk'];

  // ─── 4. Render States ───────────────────────────────────────

  // Query too short or empty
  if (!query || query.trim().length < 2) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#FF3038]/10 border border-[#FF3038]/20 text-[#FF3038] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#FF3038]/5">
          <SearchIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Find your next favorite video
        </h2>
        <p className="text-sm text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
          {query.trim().length === 1
            ? 'Search query must be at least 2 characters. Please enter a more specific keyword.'
            : 'Type a query in the search bar above or explore trending topics below.'}
        </p>

        <div className="max-w-xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center justify-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#FF3038]" />
            Trending Topics
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {sampleTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => navigate(`/search?q=${encodeURIComponent(topic)}`)}
                className="px-3.5 py-2 rounded-xl bg-[#17171D] hover:bg-[#202028] border border-white/5 hover:border-[#FF3038]/30 text-xs text-zinc-300 hover:text-white font-medium transition-all"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-2 sm:py-4">
      {/* ─── Search Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>Results for</span>
            <span className="text-[#FF3038]">"{query}"</span>
          </h1>
          {!isLoading && pagination.total !== undefined && (
            <p className="text-xs text-zinc-400 mt-0.5">
              About {pagination.total} {pagination.total === 1 ? 'result' : 'results'} found
            </p>
          )}
        </div>
      </div>

      {/* ─── Filters Bar ───────────────────────────────────────── */}
      <SearchFilters
        isOpen={filtersOpen}
        onToggle={() => setFiltersOpen((prev) => !prev)}
        activeType={type}
        activeSort={sort}
        onSelectType={handleSelectType}
        onSelectSort={handleSelectSort}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* ─── Loading Skeletons ─────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row gap-4 p-3 rounded-2xl bg-[#17171D]/40 border border-white/5 animate-pulse"
            >
              <div className="w-full sm:w-72 md:w-80 lg:w-96 aspect-video rounded-xl bg-white/10 shrink-0" />
              <div className="flex-1 flex flex-col justify-between py-1 gap-3">
                <div className="flex flex-col gap-2">
                  <div className="w-3/4 h-5 rounded bg-white/10" />
                  <div className="w-1/3 h-3 rounded bg-white/5" />
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-7 h-7 rounded-full bg-white/10" />
                    <div className="w-24 h-3.5 rounded bg-white/10" />
                  </div>
                  <div className="w-full h-3 rounded bg-white/5 mt-1" />
                </div>
                <div className="w-20 h-4 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* ─── Error State ─────────────────────────────────────── */
        <div className="py-8">
          <ErrorState
            title="Failed to Load Search Results"
            message={error}
            onRetry={() => performSearch(query, type, sort)}
          />
        </div>
      ) : results.length === 0 ? (
        /* ─── Empty Results State ─────────────────────────────── */
        <div className="py-16 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#17171D] border border-white/5 text-zinc-500 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <SearchX className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            No results found for "{query}"
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mb-6 leading-relaxed">
            Try different keywords, check your spelling, or remove filters to find what you're looking for.
          </p>
          {hasActiveFilters ? (
            <Button variant="secondary" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          ) : (
            <Link to="/">
              <Button variant="primary" size="sm">
                Explore Home
              </Button>
            </Link>
          )}
        </div>
      ) : (
        /* ─── Search Results Feed ─────────────────────────────── */
        <div className="flex flex-col gap-3.5 sm:gap-4">
          {results.map((item) => {
            // Check if item is a User/Channel or a Video
            const isChannel =
              type === 'channel' ||
              (item.username && !item.videoFile && item.subscriberCount !== undefined);

            return isChannel ? (
              <SearchResultChannelCard key={item._id} channel={item} />
            ) : (
              <SearchResultVideoCard key={item._id} video={item} />
            );
          })}

          {/* ─── Load More Button ──────────────────────────────── */}
          {pagination.hasNext ? (
            <div className="flex justify-center pt-8 pb-4">
              <Button
                variant="secondary"
                size="md"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-8 border-[#23232C] hover:border-[#FF3038]/30"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading more results...
                  </>
                ) : (
                  'Load More Results'
                )}
              </Button>
            </div>
          ) : (
            results.length > 5 && (
              <div className="text-center py-8 text-xs text-zinc-500 border-t border-white/5 mt-4">
                You've reached the end of the search results.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
