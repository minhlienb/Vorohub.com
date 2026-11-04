import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { savedApi } from '../lib/api.js';
import type { Feed } from '../lib/api.js';
import { getUserEmail } from '../lib/auth.js';

export default function SavedPage() {
  const navigate = useNavigate();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const email = getUserEmail();

  useEffect(() => {
    if (!email) {
      navigate('/login', { state: { returnPath: '/saved' } });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await savedApi.getSaved(email, { limit: 50 });
        if (cancelled) return;
        setFeeds(res.savedFeeds || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [email, navigate]);

  const unsave = async (feedId: number) => {
    if (!email) return;
    try {
      await savedApi.unsaveFeed(email, feedId);
      setFeeds((prev) => prev.filter((f) => f.id !== feedId));
    } catch (err) {
      console.error('Unsave failed:', err);
    }
  };

  if (loading) {
    return (
      <main className="main">
        <div className="saved-loading"><div className="spinner" /></div>
      </main>
    );
  }
  if (error) {
    return (
      <main className="main">
        <div className="saved-error">{error}</div>
      </main>
    );
  }

  return (
    <main className="main">
      <div className="saved-page">
        <h1 className="saved-title">Saved</h1>
        {feeds.length === 0 ? (
          <p className="saved-empty">You haven't saved any articles yet.</p>
        ) : (
          <div className="saved-list">
            {feeds.map((feed) => (
              <div key={feed.id} className="saved-item">
                <Link to={`/read/${feed.slug || feed.id}`} className="saved-link">
                  {feed.image_url && (
                    <img className="saved-thumb" src={feed.image_url} alt="" />
                  )}
                  <div className="saved-info">
                    <h3 className="saved-item-title">{feed.title}</h3>
                    <div className="saved-item-meta">
                      {feed.author} · {feed.read_time || 5} min
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  className="saved-remove"
                  onClick={() => unsave(feed.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
