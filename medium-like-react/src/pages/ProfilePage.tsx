import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { feedApi, savedApi } from '../lib/api.js';
import type { Feed } from '../lib/api.js';
import {
  getUserEmail,
  getAvatarUrl,
  clearUserSession
} from '../lib/auth.js';

function getStoredProfile(email: string): Record<string, any> {
  try {
    const raw = localStorage.getItem('profile:' + email);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function setStoredProfile(email: string, data: Record<string, any>): void {
  localStorage.setItem('profile:' + email, JSON.stringify(data));
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(getUserEmail());
  const [savedCount, setSavedCount] = useState(0);
  const [myFeeds, setMyFeeds] = useState<Feed[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [education, setEducation] = useState('');

  useEffect(() => {
    if (!email) return;
    const stored = getStoredProfile(email);
    setDisplayName(stored.displayName || '');
    setEducation(stored.education || '');
    (async () => {
      try {
        const res = await savedApi.getSaved(email, { page: 1, limit: 1 });
        setSavedCount(res.pagination?.total ?? 0);
      } catch (e) { console.error(e); }
      try {
        const res = await feedApi.getMyFeeds(email);
        setMyFeeds(res.feeds || []);
      } catch (e) { console.error(e); }
    })();
  }, [email]);

  if (!email) {
    return (
      <main className="main">
        <div className="profile-page">
          <div className="profile-signedout">
            <h1>Sign in to view your profile</h1>
            <Link to="/login" className="auth-btn">Sign in</Link>
          </div>
        </div>
      </main>
    );
  }

  const saveProfile = () => {
    setStoredProfile(email, { ...getStoredProfile(email), displayName, education });
    setEditingProfile(false);
  };

  const handleLogout = () => {
    clearUserSession();
    setEmail(null);
    navigate('/feed');
  };

  return (
    <main className="main">
      <div className="profile-page">
        <div className="profile-card">
          <img className="profile-avatar" src={getAvatarUrl(email)} alt={email} />
          <div className="profile-info">
            <h1 className="profile-email">{email}</h1>
            <span className="profile-saved-count">{savedCount} saved</span>
          </div>
        </div>

        <div className="profile-fields">
          <div className="profile-field">
            <label className="profile-field-label">Display name</label>
            {editingProfile ? (
              <input
                className="profile-field-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            ) : (
              <div className="profile-field-display">
                {displayName || <span className="profile-empty">Not set</span>}
              </div>
            )}
          </div>
          <div className="profile-field">
            <label className="profile-field-label">Education</label>
            {editingProfile ? (
              <input
                className="profile-field-input"
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. Stanford University"
              />
            ) : (
              <div className="profile-field-display">
                {education || <span className="profile-empty">Not set</span>}
              </div>
            )}
          </div>
        </div>

        <div className="profile-my-articles">
          <h2 className="profile-my-articles-title">Bài của tôi</h2>
          {myFeeds.length === 0 ? (
            <p className="profile-empty">Bạn chưa đăng bài viết nào.</p>
          ) : (
            <div className="profile-my-articles-list">
              {myFeeds.map((feed) => (
                <div key={feed.id} className="profile-article-item">
                  <div className="profile-article-info">
                    <h3 className="profile-article-title">{feed.title || '(không có tiêu đề)'}</h3>
                    <div className="profile-article-meta">
                      <span>{feed.claps || 0} claps</span>
                      <span>{feed.read_time || 0} min read</span>
                    </div>
                  </div>
                  <div className="profile-article-actions">
                    <Link className="profile-article-view" to={`/read/${feed.slug || feed.id}`}>
                      View
                    </Link>
                    <Link className="profile-article-edit" to={`/write?edit=${feed.id}`}>
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="profile-actions">
          <button
            type="button"
            className="profile-edit-btn"
            onClick={() => (editingProfile ? saveProfile() : setEditingProfile(true))}
          >
            {editingProfile ? 'Save' : 'Edit profile'}
          </button>
          <button
            type="button"
            className="profile-logout-btn"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </div>
    </main>
  );
}
