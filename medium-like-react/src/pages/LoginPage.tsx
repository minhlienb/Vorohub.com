import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authApi } from '../lib/api.js';
import { setUserEmail, validateEmail } from '../lib/auth.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = (location.state as { returnPath?: string } | null)?.returnPath || '/feed';
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!validateEmail(trimmed)) {
      setError('Please enter a valid email.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.login(trimmed);
      setUserEmail(trimmed);
      navigate(returnPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="main">
      <div className="login-page">
        <h1 className="login-title">Sign in</h1>
        <p className="login-desc">
          Enter your email. We'll use it to identify you across the app.
        </p>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            className="login-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />
          {error && <div className="login-error">{error}</div>}
          <button
            type="submit"
            className="login-btn"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <Link to="/feed" className="login-skip">Continue without signing in →</Link>
      </div>
    </main>
  );
}
