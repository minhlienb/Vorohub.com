import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaveToggle } from '../hooks/useSaveToggle.js';
import { makeExcerpt, normalizeTags } from '../lib/feedUtils.js';
import type { Feed } from '../lib/api.js';

// FeedCard renders a single article preview. Click anywhere on the
// card (except the Save button) to open it.
interface FeedCardProps {
  feed: Feed;
  onSavedChange?: (id: number, saved: boolean) => void;
  onOpen?: (feed: Feed) => void;
}

export default function FeedCard({ feed, onSavedChange, onOpen }: FeedCardProps) {
  const navigate = useNavigate();
  const { toggleSave } = useSaveToggle(onSavedChange);

  // Excerpt is derived as PLAIN TEXT and rendered as a text child, so the
  // card no longer depends on any assumption about what HTML is stored.
  const excerpt = useMemo(() => makeExcerpt(feed, 200), [feed.excerpt, feed.content]);
  const tags = useMemo(() => normalizeTags(feed.tags), [feed.tags]);

  const handleSaveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    void toggleSave(feed.id, !!feed.saved);
  };

  const handleOpen = () => {
    if (onOpen) onOpen(feed);
    else navigate(`/read/${feed.slug || feed.id}`);
  };

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
}
