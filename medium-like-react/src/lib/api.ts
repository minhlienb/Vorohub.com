// API client for the Express backend. Mirrors the original vanilla
// api.js: every helper returns parsed JSON and throws on non-2xx.
//
// We annotate the response shapes we use directly (Feed, paginated
// lists) and fall back to `any` for endpoints where the consumer
// just grabs a couple of fields. This is a prototype — keep types
// useful but not encyclopedic.

const API_BASE = '/api';

export interface Feed {
  id: number;
  title: string;
  content: string;
  author?: string;
  author_avatar?: string | null;
  image_url?: string | null;
  tags?: string[];
  read_time?: number;
  claps?: number;
  created_at?: string;
  slug?: string;
  saved?: boolean;
  // Optional — the server may include a pre-truncated excerpt for
  // list views. When missing, the client falls back to slicing content.
  excerpt?: string;
}

export interface PaginatedFeeds {
  feeds: Feed[];
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    nextCursor: number | null;
    hasMore: boolean;
    total: number;
  };
}

export interface SavedFeedsResponse {
  savedFeeds: Feed[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface MyFeedsResponse {
  feeds: Feed[];
  total: number;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
}

async function request(path: string, options: RequestOptions = {}): Promise<any> {
  const url = `${API_BASE}${path}`;
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    } as HeadersInit
  };
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }
  const response = await fetch(url, config);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const feedApi = {
  async getFeed(params: Record<string, any> = {}): Promise<PaginatedFeeds> {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) searchParams.append(key, String(value));
    }
    return request(`/feed?${searchParams.toString()}`);
  },
  async getFeedItem(id: string | number): Promise<{ feed: Feed }> {
    return request(`/feed/${id}`);
  },
  async createFeed(payload: any): Promise<{ feed: Feed }> {
    return request('/feed', { method: 'POST', body: payload });
  },
  async getMyFeeds(email: string): Promise<MyFeedsResponse> {
    return request(`/feed/mine?email=${encodeURIComponent(email)}`);
  },
  async updateFeed(id: string | number, payload: any): Promise<{ feed: Feed }> {
    return request(`/feed/${id}`, { method: 'PUT', body: payload });
  }
};

export const savedApi = {
  async getSaved(email: string, params: Record<string, any> = {}): Promise<SavedFeedsResponse> {
    const searchParams = new URLSearchParams({ email });
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) searchParams.append(key, String(value));
    }
    return request(`/saved?${searchParams.toString()}`);
  },
  async saveFeed(email: string, feedId: number): Promise<any> {
    return request('/saved', { method: 'POST', body: { email, feedId } });
  },
  async unsaveFeed(email: string, feedId: number): Promise<any> {
    return request(`/saved/${feedId}?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
  },
  async checkSaved(email: string, feedId: number): Promise<{ saved: boolean }> {
    return request(`/saved/check/${feedId}?email=${encodeURIComponent(email)}`);
  }
};

export const authApi = {
  async login(email: string): Promise<any> {
    return request('/auth/login', { method: 'POST', body: { email } });
  },
  async getUser(email: string): Promise<any> {
    return request(`/auth/user?email=${encodeURIComponent(email)}`);
  }
};

export async function checkHealth(): Promise<any> {
  return request('/health');
}

// Image upload: returns the URL string for the server-served file.
// We bypass the request() helper because the body is FormData — JSON
// content-type would be wrong, and we want the URL string directly.
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.file || !data.file.url) {
    throw new Error(data.error || 'Upload failed');
  }
  return data.file.url;
}
