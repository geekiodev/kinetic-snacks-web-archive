import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const readAccessToken = () => {
  try {
    const host = new URL(supabaseUrl).hostname;
    const projectRef = host.split('.')[0];
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { access_token?: string } | null;
    return parsed?.access_token ?? null;
  } catch {
    return null;
  }
};

const instrumentedFetch: typeof fetch = async (url, options) => {
  const urlString =
    typeof url === 'string'
      ? url
      : url instanceof Request
        ? url.url
        : url.toString();
  const headers = new Headers(options?.headers as HeadersInit | undefined);
  const hasAuthHeader = headers.has('Authorization');
  const hasApiKeyHeader = headers.has('apikey');
  const urlHost = new URL(urlString).host;

  if (urlHost === new URL(supabaseUrl).host) {
    if (!hasApiKeyHeader && supabaseAnonKey) {
      headers.set('apikey', supabaseAnonKey);
    }
    if (!hasAuthHeader) {
      const token = readAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
  }

  return fetch(url, { ...options, headers });
};

const memoryStorage = new Map<string, string>();
const safeStorage = {
  getItem: (key: string) => {
    try {
      const value = localStorage.getItem(key);
      return value;
    } catch {
      const value = memoryStorage.get(key) ?? null;
      return value;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      memoryStorage.delete(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: instrumentedFetch },
  auth: {
    storage: safeStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
