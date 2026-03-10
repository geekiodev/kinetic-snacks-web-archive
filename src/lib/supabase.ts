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
  const method = options?.method ?? 'GET';
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

  // #region agent log
  fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H4',location:'supabase.ts:12',message:'Supabase fetch start',data:{method,urlHost,urlPath:new URL(urlString).pathname,hasAuthHeader:headers.has('Authorization'),hasApiKeyHeader:headers.has('apikey')},timestamp:Date.now()})}).catch(()=>{});
  // #endregion agent log

  try {
    const response = await fetch(url, { ...options, headers });

    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H4',location:'supabase.ts:19',message:'Supabase fetch response',data:{method,urlHost:new URL(urlString).host,urlPath:new URL(urlString).pathname,status:response.status,ok:response.ok},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

    const contentType = response.headers.get('content-type') ?? 'unknown';
    try {
      const cloneText = await response.clone().text();
      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H6',location:'supabase.ts:25',message:'Supabase fetch body readable',data:{method,urlHost:new URL(urlString).host,urlPath:new URL(urlString).pathname,contentType,bodyLength:cloneText.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H6',location:'supabase.ts:31',message:'Supabase fetch body read failed',data:{method,urlHost:new URL(urlString).host,urlPath:new URL(urlString).pathname,contentType,errorMessage:message},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';

    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H5',location:'supabase.ts:28',message:'Supabase fetch error',data:{method,urlHost:new URL(urlString).host,urlPath:new URL(urlString).pathname,errorMessage:message},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

    throw error;
  }
};

const memoryStorage = new Map<string, string>();
const safeStorage = {
  getItem: (key: string) => {
    try {
      const value = localStorage.getItem(key);
      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H7',location:'supabase.ts:53',message:'Storage getItem',data:{key,source:'localStorage',hasValue:Boolean(value)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      const value = memoryStorage.get(key) ?? null;
      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H7',location:'supabase.ts:60',message:'Storage getItem fallback',data:{key,errorMessage:message,hasValue:Boolean(value)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
      return value;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H8',location:'supabase.ts:70',message:'Storage setItem',data:{key,source:'localStorage',valueLength:value.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      memoryStorage.set(key, value);
      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H8',location:'supabase.ts:78',message:'Storage setItem fallback',data:{key,errorMessage:message,valueLength:value.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H8',location:'supabase.ts:87',message:'Storage removeItem',data:{key,source:'localStorage'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      memoryStorage.delete(key);
      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H8',location:'supabase.ts:95',message:'Storage removeItem fallback',data:{key,errorMessage:message},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
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
