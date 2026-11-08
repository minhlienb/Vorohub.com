import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FeedCard from '../components/FeedCard';
import ShortViewer from '../components/ShortViewer';
import { feedApi } from '../lib/api.js';
import type { Feed } from '../lib/api.js';
import { getUserEmail, getMode } from '../lib/auth.js';
import { useHistoryOverlay } from '../hooks/useHistoryOverlay.ts';

// FeedPage: paginated list with infinite scroll + save state.
// Uses an IntersectionObserver on a sentinel <div> at the bottom
// to trigger loading the next page when the sentinel enters view.
export default function FeedPage() {
  const navigate = useNavigate();
  const {
    isOpen: viewerOpen,
    open: openViewer,
    close: closeViewer,
  } = useHistoryOverlay('shortViewerOpen');
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // Ref, not state: ShortViewer reports every swipe via onIndexChange.
  // Updating state would re-render the whole FeedCard list (O(N))
  // per swipe while the viewer is open. startIndex is only read on
  // viewer mount (slider initial), so a ref is sufficient.
  const viewerIndexRef = useRef(0);
  const feedsRef = useRef<Feed[]>([]);
  feedsRef.current = feeds;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const email = getUserEmail();

  const loadPage = useCallback(
    async (nextPage: number, searchTerm = '') => {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {
          page: nextPage,
          limit: 10
        };
        if (email) params.email = email;
        if (searchTerm) params.search = searchTerm;
        const res = await feedApi.getFeed(params);
        setFeeds((prev) => {
          if (nextPage === 1) return res.feeds || [];
          // de-dupe by id when appending
          const seen = new Set(prev.map((f) => f.id));
          return [...prev, ...(res.feeds || []).filter((f) => !seen.has(f.id))];
        });
        setHasMore(res.pagination?.hasMore ?? (res.feeds || []).length > 0);
      } catch (err) {
        console.error('Feed load failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [loading, email]
  );

  // Reset & load page 1 whenever the search term changes.
  useEffect(() => {
    setFeeds([]);
    setPage(1);
    setHasMore(true);
    loadPage(1, search);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll: observe the sentinel, ask for next page when it
  // becomes visible AND we still have more to load.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loading) {
          setPage((p) => {
            loadPage(p + 1, search);
            return p + 1;
          });
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, search, loadPage]);

  const handleSavedChange = useCallback((id: number, saved: boolean) => {
    setFeeds((prev) => prev.map((f) => (f.id === id ? { ...f, saved } : f)));
  }, []);

  const handleViewerIndexChange = useCallback((index: number) => {
    viewerIndexRef.current = index;
  }, []);

  const handleOpen = useCallback(
    (feed: Feed) => {
      if (getMode() === 'mobile') {
        // Open the in-place ShortViewer overlay instead of routing
        // away — that way the feed list state is preserved under
        // the overlay and the user lands back where they were when
        // they close it.
        const idx = feedsRef.current.findIndex((f) => f.id === feed.id);
        viewerIndexRef.current = idx >= 0 ? idx : 0;
        openViewer();
      } else {
        navigate(`/read/${feed.slug || feed.id}`);
      }
    },
    [navigate, openViewer]
  );

  const loadMore = useCallback(async (): Promise<Feed[]> => {
    if (!hasMore || loading) return [];
    const nextPage = page + 1;
    const params: Record<string, string | number> = { page: nextPage, limit: 10 };
    if (email) params.email = email;
    if (search) params.search = search;
    const res = await feedApi.getFeed(params);
    const newFeeds = res.feeds || [];
    if (newFeeds.length) {
      setFeeds((prev) => {
        const seen = new Set(prev.map((f) => f.id));
        return [...prev, ...newFeeds.filter((f) => !seen.has(f.id))];
      });
      setPage(nextPage);
    }
    setHasMore(res.pagination?.hasMore ?? newFeeds.length > 0);
    return newFeeds;
  }, [hasMore, loading, page, email, search]);

  return (
    <main className="main">
      <div className="feed-page">
        <div className="feed-search">
          <input
            type="search"
            className="feed-search-input"
            placeholder="Search articles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {error && <div className="feed-error">{error}</div>}
        <div className="feed-list" id="feed-list">
          {feeds.length === 0 && !loading && (
            <div className="feed-empty">
              {search ? 'No results.' : 'Nothing here yet.'}
            </div>
          )}
          {feeds.map((feed) => (
            <FeedCard
              key={feed.id}
              feed={feed}
              onSavedChange={handleSavedChange}
              onOpen={handleOpen}
            />
          ))}
          {loading && (
            <div className="feed-loading">
              <div className="spinner" />
              <span>Loading…</span>
            </div>
          )}
          <div ref={sentinelRef} className="feed-sentinel" />
        </div>
      </div>
      {viewerOpen && (
        <ShortViewer
          feeds={feeds}
          startIndex={viewerIndexRef.current}
          onClose={closeViewer}
          onLoadMore={hasMore ? loadMore : undefined}
          onIndexChange={handleViewerIndexChange}
          onSaveChange={handleSavedChange}
        />
      )}
    </main>
  );
}
