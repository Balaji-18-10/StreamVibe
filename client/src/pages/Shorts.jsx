import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronUp, ChevronDown, Compass, Flame, Loader2, Sparkles } from 'lucide-react';
import ShortCard from '../components/shorts/ShortCard.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Button from '../components/ui/Button.jsx';
import { videoService } from '../services/index.js';

export default function Shorts() {
  const { videoId } = useParams();
  const navigate = useNavigate();

  const [shorts, setShorts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, hasNext: false });
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(true);

  const feedRef = useRef(null);
  const itemRefs = useRef([]);

  // ─── 1. Fetch Initial Shorts Feed ──────────────────────────
  const fetchInitialShorts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await videoService.getShorts({ page: 1, limit: 10 });
      let fetched = res.data?.data?.videos || [];

      // If a specific videoId was requested in URL
      if (videoId) {
        const existingIdx = fetched.findIndex((s) => s._id === videoId);
        if (existingIdx !== -1) {
          // It's already in the feed
          setShorts(fetched);
          setActiveIndex(existingIdx);
        } else {
          // Fetch the specific short and prepend it
          try {
            const specificRes = await videoService.getById(videoId);
            if (specificRes.data?.data?.video) {
              const specific = specificRes.data.data.video;
              fetched = [specific, ...fetched.filter((s) => s._id !== videoId)];
            }
          } catch {
            // Ignore error, fallback to normal list
          }
          setShorts(fetched);
          setActiveIndex(0);
        }
      } else {
        setShorts(fetched);
        setActiveIndex(0);
        if (fetched[0]?._id) {
          window.history.replaceState(null, '', `/shorts/${fetched[0]._id}`);
        }
      }

      setPagination(
        res.data?.data?.pagination || { page: 1, limit: 10, totalPages: 1, hasNext: false }
      );
    } catch (err) {
      console.error('Failed to load Shorts feed:', err);
      setError(err.response?.data?.message || 'Failed to load Shorts feed');
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchInitialShorts();
  }, [fetchInitialShorts]);

  // ─── 2. Scroll to Initial Active Short Once Loaded ─────────
  useEffect(() => {
    if (!isLoading && shorts.length > 0 && activeIndex > 0) {
      const timer = setTimeout(() => {
        const el = itemRefs.current[activeIndex];
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, activeIndex, shorts.length]);

  // ─── 3. IntersectionObserver for Active Index Tracking ─────
  useEffect(() => {
    if (isLoading || shorts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!Number.isNaN(index) && index !== activeIndex) {
              setActiveIndex(index);
              const currentShort = shorts[index];
              if (currentShort?._id) {
                // Update URL to current short without triggering full navigation reload
                window.history.replaceState(null, '', `/shorts/${currentShort._id}`);
              }
            }
          }
        });
      },
      {
        root: feedRef.current,
        threshold: 0.6,
      }
    );

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [shorts, activeIndex, isLoading]);

  // ─── 4. Scroll To Index Helper ─────────────────────────────
  const scrollToIndex = useCallback(
    (targetIndex) => {
      if (targetIndex < 0 || targetIndex >= shorts.length) return;
      const targetEl = itemRefs.current[targetIndex];
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [shorts.length]
  );

  // ─── 5. Keyboard Navigation ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tagName = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (tagName === 'input' || tagName === 'textarea' || e.target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'PageDown') {
        e.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'PageUp') {
        e.preventDefault();
        scrollToIndex(activeIndex - 1);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, scrollToIndex]);

  // ─── 6. Infinite Scroll / Load More ────────────────────────
  const loadMoreShorts = useCallback(async () => {
    if (isLoadingMore || !pagination.hasNext) return;
    setIsLoadingMore(true);
    try {
      const nextPage = pagination.page + 1;
      const res = await videoService.getShorts({ page: nextPage, limit: 10 });
      if (res.data?.success) {
        const newVideos = res.data.data?.videos || [];
        setShorts((prev) => {
          const existingIds = new Set(prev.map((s) => s._id));
          const uniqueNew = newVideos.filter((s) => !existingIds.has(s._id));
          return [...prev, ...uniqueNew];
        });
        setPagination(
          res.data.data?.pagination || { page: nextPage, hasNext: false }
        );
      }
    } catch (err) {
      console.warn('Failed to load more shorts:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, pagination]);

  useEffect(() => {
    if (
      activeIndex >= shorts.length - 2 &&
      pagination.hasNext &&
      !isLoadingMore &&
      !isLoading
    ) {
      loadMoreShorts();
    }
  }, [activeIndex, shorts.length, pagination.hasNext, isLoadingMore, isLoading, loadMoreShorts]);

  // ─── 7. Loading Skeleton State ─────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="relative w-full max-w-[420px] h-[calc(100dvh-5.5rem)] max-h-[820px] aspect-[9/16] bg-[#17171D] rounded-3xl overflow-hidden border border-white/5 animate-pulse flex flex-col justify-between p-6">
          <div className="flex justify-between items-center">
            <div className="w-10 h-10 rounded-full bg-white/10" />
            <div className="w-20 h-6 rounded-full bg-white/10" />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="w-28 h-3.5 rounded bg-white/10" />
                <div className="w-16 h-3 rounded bg-white/5" />
              </div>
              <div className="w-20 h-7 rounded-full bg-white/10" />
            </div>
            <div className="w-3/4 h-4 rounded bg-white/10" />
            <div className="w-1/2 h-3 rounded bg-white/5" />
            <div className="w-full h-1 rounded-full bg-white/10 mt-2" />
          </div>

          {/* Floating Right Actions Skeleton */}
          <div className="absolute right-4 bottom-16 flex flex-col gap-5 items-center">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 rounded-full bg-white/10" />
                <div className="w-6 h-2.5 rounded bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── 8. Error State ────────────────────────────────────────
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <ErrorState
          title="Could Not Load Shorts"
          message={error}
          onRetry={fetchInitialShorts}
        />
      </div>
    );
  }

  // ─── 9. Empty State ────────────────────────────────────────
  if (shorts.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-[#FF3038]/10 border border-[#FF3038]/20 flex items-center justify-center text-[#FF3038] mb-6 shadow-xl shadow-[#FF3038]/5">
          <Flame className="w-10 h-10 stroke-[1.75]" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">No Shorts Available</h2>
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          Be the first creator to upload a vertical short, or explore standard videos on Home.
        </p>
        <div className="flex gap-3">
          <Link to="/">
            <Button variant="primary" leftIcon={Compass}>
              Explore Home
            </Button>
          </Link>
          <Link to="/upload">
            <Button variant="secondary" leftIcon={Sparkles}>
              Create Short
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── 10. Main Shorts Feed ──────────────────────────────────
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* ─── Vertical Snap Container ──────────────────────────── */}
      <div
        ref={feedRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth focus:outline-none flex flex-col items-center select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {shorts.map((short, index) => (
          <div
            key={short._id}
            data-index={index}
            ref={(el) => (itemRefs.current[index] = el)}
            className="w-full h-full flex-shrink-0 flex items-center justify-center snap-start snap-always"
          >
            <ShortCard
              short={short}
              isActive={index === activeIndex}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((prev) => !prev)}
            />
          </div>
        ))}

        {/* Load More Spinner */}
        {isLoadingMore && (
          <div className="w-full py-6 flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-7 h-7 text-[#FF3038] animate-spin" />
          </div>
        )}
      </div>

      {/* ─── Desktop Floating Up / Down Controls ──────────────── */}
      <div className="hidden lg:flex flex-col gap-3 fixed right-8 top-1/2 -translate-y-1/2 z-30">
        <button
          type="button"
          onClick={() => scrollToIndex(activeIndex - 1)}
          disabled={activeIndex <= 0}
          className="w-12 h-12 rounded-full bg-[#17171D]/90 hover:bg-[#23232C] border border-white/10 text-white flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-xl hover:scale-105 active:scale-95"
          title="Previous Short (Up Arrow / K)"
        >
          <ChevronUp className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={() => scrollToIndex(activeIndex + 1)}
          disabled={activeIndex >= shorts.length - 1}
          className="w-12 h-12 rounded-full bg-[#17171D]/90 hover:bg-[#23232C] border border-white/10 text-white flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-xl hover:scale-105 active:scale-95"
          title="Next Short (Down Arrow / J)"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
