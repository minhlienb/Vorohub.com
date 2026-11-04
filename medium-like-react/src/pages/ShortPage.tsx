import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { feedApi, savedApi } from '../lib/api.js';
import type { Feed } from '../lib/api.js';
import { getUserEmail, getAvatarUrl } from '../lib/auth.js';

// ShortPage (placeholder): the full TikTok-style viewer lives in
// src/components/ShortViewer.tsx and is rendered as an overlay from
// the feed list. This page is hit when the user lands on /short/:slug
// directly (e.g. from a deep link) — it falls back to a compact
// single-card view of the article.
export default function ShortPage() {
  const { slug } = useParams<{ slug: string }>();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const email = getUserEmail();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slug) return;
        const res = await feedApi.getFeedItem(slug);
        if (cancelled) return;
        setFeed(res.feed);
        if (email) {
          try {
            const s = await savedApi.checkSaved(email, res.feed.id);
            if (!cancelled) setSaved(!!s.saved);
          } catch (e) { /* non-fatal */ }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      }
    })();
    return () => { cancelled = true; };
  }, [slug, email]);

  const toggleSave = async () => {
    if (!email || !feed) return;
    try {
      if (saved) {
        await savedApi.unsaveFeed(email, feed.id);
        setSaved(false);
      } else {
        await savedApi.saveFeed(email, feed.id);
        setSaved(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (error) {
    return (
      <main className="main">
        <div className="short-error">{error}</div>
        <Link to="/feed">Back to feed</Link>
      </main>
    );
  }
  if (!feed) {
    return (
      <main className="main">
        <div className="short-loading"><div className="spinner" /></div>
      </main>
    );
  }

  return (
    <main className="main short-main">
      <article className="short-article">
        {feed.image_url && (
          <div className="short-cover">
            <img src={feed.image_url} alt={feed.title || ''} />
          </div>
        )}
        <h1 className="short-title">{feed.title || '(Untitled)'}</h1>
        <div className="short-meta">
          <img
            className="short-avatar"
            src={feed.author_avatar || getAvatarUrl(feed.author || 'anon')}
            alt=""
          />
          <span>{feed.author || 'Anonymous'}</span>
          <span>·</span>
          <span>{feed.read_time || 5} min</span>
        </div>
        <div
          className="short-content"
          dangerouslySetInnerHTML={{ __html: feed.content || '' }}
        />
        <div className="short-actions">
          <Link to={`/read/${feed.slug || feed.id}`} className="short-full">
            Read full →
          </Link>
          {email && (
            <button
              type="button"
              className={`short-save${saved ? ' saved' : ''}`}
              onClick={toggleSave}
            >
              {saved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>
      </article>
    </main>
  );
}
