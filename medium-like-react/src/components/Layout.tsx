import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  getUserEmail,
  getAvatarUrl,
  clearUserSession,
  isAuthenticated
} from '../lib/auth.js';

// Shared header. Mirrors the Barba version's headerNav() helper but
// driven by NavLink so active styling is declarative.
function Header() {
  const [email, setEmail] = useState(getUserEmail());

  useEffect(() => {
    const onAuth = (e: Event) => {
      const detail = (e as CustomEvent<{ email: string | null }>).detail;
      setEmail(detail.email);
    };
    window.addEventListener('auth:change', onAuth);
    return () => window.removeEventListener('auth:change', onAuth);
  }, []);

  const handleLogout = () => {
    clearUserSession();
    window.location.href = '/feed';
  };

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">Feed</Link>
        <nav className="nav">
          <NavLink
            to="/feed"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Feed
          </NavLink>
          <NavLink
            to="/saved"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Saved
          </NavLink>
          <NavLink
            to="/write"
            className="nav-link nav-write"
            aria-label="Write article"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-link profile-link${isActive ? ' active' : ''}`}
            aria-label="Profile"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </NavLink>
          {email && (
            <button
              type="button"
              className="write-publish"
              onClick={handleLogout}
            >
              Log out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function Layout() {
  const location = useLocation();
  const navType = useNavigationType();
  const previousPathRef = useRef(location.pathname);
  // ScrollRestoration (in App.tsx) restores scroll on popstate; for
  // forward route navigation we want to land at the top. Same-path history
  // state changes (such as opening ShortViewer) must preserve feed scroll.
  useEffect(() => {
    const pathChanged = previousPathRef.current !== location.pathname;
    if (navType !== 'POP' && pathChanged) {
      window.scrollTo(0, 0);
    }
    previousPathRef.current = location.pathname;
  }, [location.pathname, navType]);

  return (
    <div className="app">
      <Header />
      <Outlet />
    </div>
  );
}
