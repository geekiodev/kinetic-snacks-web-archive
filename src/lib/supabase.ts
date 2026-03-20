import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { processLock } from '@supabase/auth-js';

const memoryStorage = new Map<string, string>();

const fallbackStorage = {
  getItem: (key: string) => memoryStorage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStorage.set(key, value);
  },
  removeItem: (key: string) => {
    memoryStorage.delete(key);
  },
};

const safeStorage = {
  getItem: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return fallbackStorage.getItem(key);
    }
  },
  setItem: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      fallbackStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      fallbackStorage.removeItem(key);
    }
  },
};

const isTestEnvironment = import.meta.env.MODE === 'test';
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (isTestEnvironment ? 'https://example.supabase.co' : undefined);
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (isTestEnvironment ? 'test-anon-key' : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

const createSupabaseClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: safeStorage,
      lock: processLock,
    },
  });

const globalKey = '__kinetic_snacks_supabase__';
const globalScope = globalThis as typeof globalThis & {
  [globalKey]?: SupabaseClient;
};

export const supabase = globalScope[globalKey] ?? createSupabaseClient();

if (import.meta.env.DEV) {
  globalScope[globalKey] = supabase;
}
