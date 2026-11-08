import { memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaveToggle } from '../hooks/useSaveToggle.js';
import { makeExcerpt, normalizeTags } from '../lib/feedUtils.js';
import type { Feed } from '../lib/api.js';

// Feed card preview.
interface FeedCardProps {
  feed: Feed;
  onSavedChange?: (id: number, saved: boolean) => void;
  onOpen?: (feed: Feed) => void;
}

// Memoized: FeedPage re-renders on page loads/search while viewer is
// open; unchanged cards must bail out (stable feed ref + stable
// callbacks from FeedPage) instead of re-rendering O(N) behind overlay.
const FeedCard = memo(function FeedCard({ feed, onSavedChange, onOpen }: FeedCardProps) {
  const navigate = useNavigate();
  const { toggleSave } = useSaveToggle(onSavedChange);

  const excerpt = useMemo(() => makeExcerpt(feed, 200), [feed.excerpt, feed.content]);
  const tags = useMemo(() => normalizeTags(feed.tags), [feed.tags]);

  const handleSaveClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      void toggleSave(feed.id, !!feed.saved);
    },
    [toggleSave, feed.id, feed.saved]
  );

  const handleOpen = useCallback(() => {
    if (onOpen) onOpen(feed);
    else navigate(`/read/${feed.slug || feed.id}`);
  }, [onOpen, navigate, feed]);

  return (
    <article className="feed-card" onClick={handleOpen}>
      {feed.image_url && (
        <div className="feed-card-image">
          <img src={feed.image_url} alt={feed.title || ''} loading="lazy" />
        </div>
      )}
      <div className="feed-card-body">
        <h2 className="feed-card-title">{feed.title || '(Untitled)'}</h2>
        <p className="feed-card-excerpt">{excerpt}</p>
        <div className="feed-card-meta">
          <span className="feed-card-author">{feed.author || 'Anonymous'}</span>
          <span className="feed-card-sep">·</span>
          <span className="feed-card-time">{feed.read_time || 5} min read</span>
          <span className="feed-card-sep">·</span>
          <span className="feed-card-claps">{feed.claps || 0} ❤</span>
        </div>
        {tags.length > 0 && (
          <div className="feed-card-tags">
            {tags.map((t) => (
              <span key={t} className="feed-card-tag">#{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="feed-card-actions">
        <button
          type="button"
          className={`feed-card-save${feed.saved ? ' saved' : ''}`}
          onClick={handleSaveClick}
          aria-label={feed.saved ? 'Unsave' : 'Save'}
        >
          {feed.saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </article>
  );
});

export default FeedCard;
