# Auth regression notes (work branch vs pre-merge mainline)

## Comparison baseline
- Compared current `work` branch auth implementation against commit `01a075e` (the pre-PR mainline commit immediately before the auth refactors were merged).

## Primary regression identified
1. **Supabase client now silently falls back to fake credentials**
   - `src/lib/supabase.ts` was changed to initialize the client with:
     - `https://example.supabase.co`
     - a dummy anon JWT-like string
   - This means any missing/misread env var does **not** fail fast, and auth calls are sent to a non-project endpoint with invalid credentials.
   - Result: login/signup/session behavior appears flaky or consistently broken, and diagnostics are confusing because the app still has a client instance.

## Why this causes broad auth failures
- Auth UI checks env vars in `Auth.tsx`, but other auth/session paths still depend on the globally initialized Supabase client.
- A globally misconfigured client can cause:
  - invalid auth responses,
  - session lookup failures,
  - apparent timeout/retry issues that are actually misrouting/invalid-key failures.

## Fix applied in this branch
- Reverted `src/lib/supabase.ts` to require real env vars for `createClient`.
- Removed fake fallback URL/key so configuration errors are explicit instead of silently routing auth to invalid endpoints.
