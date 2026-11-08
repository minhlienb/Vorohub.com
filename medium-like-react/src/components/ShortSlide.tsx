import { memo, useCallback } from 'react';
import type { Feed } from '../lib/api.js';
import { getAvatarUrl, getPlaceholderImage } from '../lib/auth.js';
import { normalizeTags } from '../lib/feedUtils.ts';

interface ShortSlideProps {
  feed: Feed;
  isActive: boolean;
  isSaved: boolean;
  onToggleSave: (feedId: number, isSaved: boolean) => void;
  onOpenFull: (feed: Feed) => void;
}

// Memoized so swiping (currentIndex change in parent) only re-renders
// the ~3 slides in the render window; far slides bail out because
// feed/isSaved/isActive/callback props are referentially stable.
const ShortSlide = memo(function ShortSlide({
  feed,
  isActive,
  isSaved,
  onToggleSave,
  onOpenFull,
}: ShortSlideProps) {
  const handleToggleSave = useCallback(
    () => onToggleSave(feed.id, isSaved),
    [onToggleSave, feed.id, isSaved]
  );
  const handleOpenFull = useCallback(() => onOpenFull(feed), [onOpenFull, feed]);

  // Far slides: single empty div — no image/avatar string work, no tag
  // parsing, no footer/buttons. Root node stays stable for KeenSlider.
  if (!isActive) {
    return (
      <div className="short-slide keen-slider__slide">
        <div className="short-scroll" />
      </div>
    );
  }

  const tags = normalizeTags(feed.tags);
  const imageUrl =
    feed.image_url || getPlaceholderImage(String(feed.id || 'feed'), 800, 1000);
  const authorAvatar = feed.author_avatar || getAvatarUrl(feed.author || 'default');

  return (
    <div className="short-slide keen-slider__slide">
      <div className="short-scroll">
        <img
          className="short-image"
          src={imageUrl}
          alt={feed.title || 'Untitled'}
          loading="lazy"
          decoding="async"
        />
        <div className="short-meta">
          <img
            className="short-avatar"
            src={authorAvatar}
            alt={feed.author || 'Unknown'}
          />
          <div>
            <div className="short-author">{feed.author || 'Unknown'}</div>
            <div className="short-date">{feed.read_time || 5} min</div>
          </div>
        </div>
        <h1 className="short-title">{feed.title || 'Untitled'}</h1>
        {tags.length > 0 && (
          <div className="short-tags">
            {tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div
          className="short-content"
          dangerouslySetInnerHTML={{ __html: feed.content || '' }}
        />
        <div className="short-hint">
          End of article · keep swiping for the next feed ↑
        </div>
      </div>

      <div className="short-footer">
        <span className="short-claps">{feed.claps || 0} claps</span>
        <button
          type="button"
          className={`save-btn${isSaved ? ' saved' : ''}`}
          data-action="save"
          data-keen-slider-clickable="true"
          onClick={handleToggleSave}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span className="save-text">{isSaved ? 'Saved' : 'Save'}</span>
        </button>
        <button
          type="button"
          className="short-open-full"
          onClick={handleOpenFull}
        >
          Read full
        </button>
      </div>
    </div>
  );
});

export default ShortSlide;
