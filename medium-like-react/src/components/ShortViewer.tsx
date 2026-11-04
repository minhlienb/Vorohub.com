import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import 'keen-slider/keen-slider.min.css';
import type { Feed } from '../lib/api.js';
import { getMode } from '../lib/auth.js';
import { getFeedPruneCount } from '../lib/feedUtils.ts';
import { useSaveToggle } from '../hooks/useSaveToggle.ts';
import { useShortViewerSlider } from '../hooks/useShortViewerSlider.ts';
import ShortSlide from './ShortSlide.tsx';
import type { ShortViewerProps } from './ShortViewer.types.ts';

// Slides within this distance of the active one render their full body;
// the rest render an empty shell (keen still sizes/positions them).
const RENDER_WINDOW = 1;
const KEEP_PREVIOUS_FEEDS = 6;

export default function ShortViewer({
  feeds,
  startIndex = 0,
  onClose,
  onLoadMore,
  onSaveChange,
  onPruneFeedsBefore,
  onIndexChange,
}: ShortViewerProps) {
  const navigate = useNavigate();
  const {
    overlayRef,
    trackRef,
    currentIndex,
    queueRebase,
    runWhenIdle,
  } = useShortViewerSlider(feeds.length, startIndex, onClose);
  const pruneScheduledRef = useRef(false);

  // true between mount and unmount. Set to true on mount (not just false
  // on unmount) so React StrictMode's mount→unmount→mount doesn't leave it
  // stuck at "unmounted".
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [loadingMore, setLoadingMore] = useState(false);

  // --- Saved state -------------------------------------------------------
  // Source of truth is feed.saved (owned by the parent). `savedOverrides`
  // only holds entries the user changed in THIS viewer, so feeds appended
  // later by onLoadMore fall back to their own feed.saved instead of
  // silently showing "Save".
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

  useEffect(() => {
    const pruneCount = getFeedPruneCount(currentIndex, KEEP_PREVIOUS_FEEDS);
    if (pruneCount === 0 || pruneScheduledRef.current) return;

    pruneScheduledRef.current = true;
    const cancel = runWhenIdle(() => {
      pruneScheduledRef.current = false;
      const count = getFeedPruneCount(currentIndex, KEEP_PREVIOUS_FEEDS);
      if (count === 0) return;

      const prunedIds = feeds.slice(0, count).map((feed) => feed.id);
      setSavedOverrides((previous) => {
        if (!prunedIds.some((id) => id in previous)) return previous;
        const next = { ...previous };
        for (const id of prunedIds) delete next[id];
        return next;
      });
      queueRebase(currentIndex - count);
      onPruneFeedsBefore(count);
    });

    return () => {
      cancel();
      pruneScheduledRef.current = false;
    };
  }, [currentIndex, feeds, onPruneFeedsBefore, queueRebase, runWhenIdle]);

  // --- Lazy load more ----------------------------------------------------
  // The in-flight guard is a ref, NOT part of the effect's deps. (Having
  // `loadingMore` in deps re-ran the effect right after setLoadingMore(true),
  // whose cleanup flagged the request "cancelled" — so setLoadingMore(false)
  // never ran and the spinner stuck forever.) `onLoadMore` is read through a
  // ref so a parent passing a fresh function each render can't retrigger it.
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!onLoadMoreRef.current || loadingRef.current) return;
    if (currentIndex < feeds.length - 2) return;

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
    // Re-evaluated when the user moves or the list grows. If a page adds
    // nothing, feeds.length is unchanged so this does not loop.
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

  return (
    <div ref={overlayRef} className="short-overlay" data-mode="mobile">
      {/* Progress dots */}
      <div className="short-progress" aria-hidden="true">
        {feeds.map((f, i) => (
          <span key={f.id} className={i === currentIndex ? 'active' : ''} />
        ))}
      </div>

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
              onToggleSave={(feedId, saved) => void toggleSave(feedId, saved)}
              onOpenFull={openFull}
            />
          );
        })}
      </div>

      <div className="short-edge-zone short-edge-zone-left" aria-hidden="true" />
      <div className="short-edge-zone short-edge-zone-right" aria-hidden="true" />

      {/* Hint pills */}
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
