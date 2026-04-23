---
name: API Architecture — Edge Functions
description: Complete edge function inventory, what each does, and the server-vs-client boundary decisions
type: project
---

## Architecture Principle

All mutations go through edge functions. Client only reads directly from Supabase (exercises, assignments, profiles). No direct client writes except through edge functions.

## Edge Function Inventory

| Function | Purpose | Auth pattern |
|---|---|---|
| `complete-exercise` | Record completion, validate slot ownership, mark slot completed | User JWT → service role writes |
| `complete-onboarding` | Save preferences, init notification_preferences, ensure free subscription row | User JWT → service role writes |
| `update-user-preferences` | Validate + save preferences and notification settings | User JWT → service role writes |
| `get-subscription-status` | Authoritative plan lookup from subscriptions table | User JWT |
| `allow-snack-assignment` | Plan/swap/snooze/skip slots | User JWT |
| `analyze-space` | AI space analysis, store approved exercises, return to client | User JWT |
| `allow-space-analysis` | Entitlement check for space analysis | User JWT |
| `notifications-plan` | Decide whether to send a nudge (dry-run supported) | User JWT |
| `notifications-dispatch` | Find due slots, mark notified, log nudge events. Called by pg_cron every 5 min | Service role (no user JWT) |

## Service Role Pattern

New edge functions (complete-exercise, complete-onboarding, update-user-preferences) use a two-client pattern:
1. `userClient` — created with anon key + user Authorization header → used for `auth.getUser()` only
2. `admin` — created with `SUPABASE_SERVICE_ROLE_KEY` → used for all DB writes

**Why:** Bypasses RLS for validated server-side mutations. The edge function IS the business logic layer.

## Notifications Cron

- pg_cron job `kinetic-snacks-dispatch-notifications` fires every 5 minutes
- Reads `ks_project_url` and `ks_anon_key` from Vault (no hardcoded secrets)
- Calls `notifications-dispatch` via `net.http_post`
- Verified working on 2026-04-23 (returned 200, notified:0, skipped:0 with no due slots)
- Vault secrets stored correctly: `vault.create_secret(value, name)` — value is FIRST argument

## Key Data Flow: Exercise Completion

**Before:** Client → `supabase.from('exercise_completions').insert()` + direct slot status update  
**After:** Client → `complete-exercise` edge function → validates slot → service role writes both tables atomically

## Key Data Flow: Subscription Status

**Before:** Read `profiles.subscription_plan` (stale, could be overridden by subscriptions table)  
**After:** `get-subscription-status` edge function → `getEntitlements()` → checks subscriptions table first

## Space Analysis Pipeline Fix (2026-04-23)

Generated exercises were stored with `review_status: 'pending'` but Dashboard filtered for `'approved'`.

**Fix:** `analyze-space` now stores with `review_status: 'approved'`. The AI limitations filter + post-filter in the function ensures safety. Admin review is for promoting to the shared library, not gatekeeping the generating user's own exercises.
