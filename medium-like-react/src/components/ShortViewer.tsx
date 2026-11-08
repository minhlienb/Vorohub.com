import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import 'keen-slider/keen-slider.min.css';
import type { Feed } from '../lib/api.js';
import { getMode } from '../lib/auth.js';
import { useSaveToggle } from '../hooks/useSaveToggle.ts';
import { useShortViewerSlider } from '../hooks/useShortViewerSlider.ts';
import ShortSlide from './ShortSlide.tsx';
import type { ShortViewerProps } from './ShortViewer.types.ts';

// Render window around active slide.
const RENDER_WINDOW = 1;

export default function ShortViewer({
  feeds,
  startIndex = 0,
  onClose,
  onLoadMore,
  onSaveChange,
  onIndexChange,
}: ShortViewerProps) {
  const navigate = useNavigate();
  const { overlayRef, trackRef, currentIndex } = useShortViewerSlider(feeds.length, startIndex, onClose);

  // Mounted flag for async callbacks.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [loadingMore, setLoadingMore] = useState(false);

  // Saved state override.
  const [savedOverrides, setSavedOverrides] = useState<Record<number, boolean>>({});
  const handleSavedChange = useCallback(
    (feedId: number, saved: boolean) => {
      setSavedOverrides((prev) => ({ ...prev, [feedId]: saved }));
      onSaveChange?.(feedId, saved);
    },
    [onSaveChange]
  );
  const { toggleSave } = useSaveToggle(handleSavedChange);

  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);


  // Lazy load next page.
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!onLoadMoreRef.current || loadingRef.current) return;
    // Prefetch 5 slides early so KeenSlider.update() (new max)
    // settles before the user reaches the old last slide.
    // At length-2 the append lands exactly on the boundary swipe
    // and the next() call hits the stale max and is dropped.
    if (currentIndex < feeds.length - 5) return;

    loadingRef.current = true;
    setLoadingMore(true);
    (async () => {
      try {
        await onLoadMoreRef.current?.();
      } catch (err) {
        console.error('Load more failed:', err);
      } finally {
        loadingRef.current = false;
        if (mountedRef.current) setLoadingMore(false);
      }
    })();
  }, [currentIndex, feeds.length]);

  const openFull = useCallback(
    (feed: Feed) => {
      const path = `/read/${feed.slug || feed.id}`;
      if (getMode() === 'mobile') {
        navigate(path, { replace: true });
      } else {
        window.location.href = path;
      }
    },
    [navigate]
  );

  // Stable prop for memoized ShortSlide (inline arrow = new fn every
  // parent render = N re-renders per swipe).
  const handleToggleSave = useCallback(
    (feedId: number, saved: boolean) => {
      void toggleSave(feedId, saved);
    },
    [toggleSave]
  );

  // Preload next slide's image (O(1)) so the next swipe doesn't stall
  // on network/decode. Browser cache keeps bitmap until GC.
  useEffect(() => {
    const next = feeds[currentIndex + 1];
    if (!next?.image_url) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = next.image_url;
  }, [currentIndex, feeds]);

  return (
    <div ref={overlayRef} className="short-overlay" data-mode="mobile">
      {/* <div className="short-progress" aria-hidden="true">
        {feeds.map((f, i) => (
          <span key={f.id} className={i === currentIndex ? 'active' : ''} />
        ))}
      </div> */}

      <div ref={trackRef} className="short-track keen-slider">
        {feeds.map((feed, index) => {
          const isSaved = savedOverrides[feed.id] ?? !!feed.saved;
          const nearActive = Math.abs(index - currentIndex) <= RENDER_WINDOW;

          return (
            <ShortSlide
              key={feed.id}
              feed={feed}
              isActive={nearActive}
              isSaved={isSaved}
              onToggleSave={handleToggleSave}
              onOpenFull={openFull}
            />
          );
        })}
      </div>

      <div className="short-edge-zone short-edge-zone-left" aria-hidden="true" />
      <div className="short-edge-zone short-edge-zone-right" aria-hidden="true" />

      <div className="short-overscroll-hint prev" aria-hidden="true">
        <span className="idle">Keep swiping for the previous feed ↓</span>
        <span className="go">Release for the previous feed ↓</span>
      </div>
      <div className="short-overscroll-hint next" aria-hidden="true">
        <span className="idle">Keep swiping for the next feed ↑</span>
        <span className="go">Release for the next feed ↑</span>
      </div>

      <button
        type="button"
        className="short-close"
        aria-label="Close"
        onClick={onClose}
      >
        ✕
      </button>

      {loadingMore && (
        <div className="short-loading-more">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
