// Auth helpers. localStorage is the single source of truth for the
// prototype — the server's `users` table is just an email list.

const EMAIL_KEY = 'userEmail';

export function getUserEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY) || null;
}

export function setUserEmail(email: string): void {
  localStorage.setItem(EMAIL_KEY, email);
  window.dispatchEvent(new CustomEvent('auth:change', { detail: { email } }));
}

export function clearUserSession(): void {
  localStorage.removeItem(EMAIL_KEY);
  window.dispatchEvent(new CustomEvent('auth:change', { detail: { email: null } }));
}

export function isAuthenticated(): boolean {
  return !!getUserEmail();
}

export function getAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export function getPlaceholderImage(seed: string, width = 800, height = 450): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

export function getStoredDisplayName(email: string | null): string {
  if (!email) return '';
  try {
    const raw = localStorage.getItem('profile:' + email);
    return raw ? JSON.parse(raw).displayName || '' : '';
  } catch {
    return '';
  }
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Lightweight mobile-vs-desktop switch. The original used getMode() that
// sniffed the viewport; we keep the same intent so the read / short
// routing decision matches the Barba version.
export function getMode(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth <= 768 ? 'mobile' : 'desktop';
}
