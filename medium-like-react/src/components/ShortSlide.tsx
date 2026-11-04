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

export default function ShortSlide({
  feed,
  isActive,
  isSaved,
  onToggleSave,
  onOpenFull,
}: ShortSlideProps) {
  const tags = isActive ? normalizeTags(feed.tags) : [];
  const imageUrl =
    feed.image_url || getPlaceholderImage(String(feed.id || 'feed'), 800, 1000);
  const authorAvatar = feed.author_avatar || getAvatarUrl(feed.author || 'default');

  return (
    <div className="short-slide keen-slider__slide">
      <div className="short-scroll">
        {isActive && (
          <>
            <img
              className="short-image"
              src={imageUrl}
              alt={feed.title || 'Untitled'}
              loading="lazy"
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
          </>
        )}
      </div>

      <div className="short-footer">
        <span className="short-claps">{feed.claps || 0} claps</span>
        <button
          type="button"
          className={`save-btn${isSaved ? ' saved' : ''}`}
          data-action="save"
          data-keen-slider-clickable="true"
          onClick={() => onToggleSave(feed.id, isSaved)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span className="save-text">{isSaved ? 'Saved' : 'Save'}</span>
        </button>
        <button
          type="button"
          className="short-open-full"
          onClick={() => onOpenFull(feed)}
        >
          Read full
        </button>
      </div>
    </div>
  );
}