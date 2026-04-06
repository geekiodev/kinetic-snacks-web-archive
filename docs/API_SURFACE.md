# API Surface Specification

This document defines the current API-minded surface for Kinetic Snacks, including
which actions are direct database writes vs. required Edge Functions.

## Principles
- **Edge required** for entitlements, metering, paid features, and system-owned data.
- **DB direct** only for user-owned data with strong RLS and no monetization risk.
- **All writes** must be RLS-protected, validated, and auditable.

---

## Edge Functions (Authoritative)

### allow-exercise-view
- **Purpose:** Enforce free-tier exercise view limits.
- **Input:** `{ exercise_id: string }`
- **Output:** `{ allowed: boolean, remaining: number | null, limit: number | null }`
- **Notes:** Writes to `exercise_views` ledger when allowed.

### allow-space-analysis
- **Purpose:** Enforce premium access for space analysis.
- **Input:** `{}`
- **Output:** `{ allowed: boolean }`

### allow-ai-plan-generation
- **Purpose:** Meter AI plan generation.
- **Input:** `{}`
- **Output:** `{ allowed: boolean, remaining: number | null, limit: number | null }`
- **Notes:** Writes to `ai_plan_generations` ledger when allowed.

### allow-exercise-generation
- **Purpose:** Meter exercise generation (LLM usage).
- **Input:** `{}`
- **Output:** `{ allowed: boolean, remaining: number | null, limit: number | null }`
- **Notes:** Writes to `exercise_generations` ledger when allowed.

### allow-export
- **Purpose:** Enforce export entitlement.
- **Input:** `{}`
- **Output:** `{ allowed: boolean }`

### allow-snack-assignment
- **Purpose:** Authoritative daily snack assignment + manual swap metering.
- **Input:** `{ day_key?: string, swap?: boolean, candidate_exercise_ids: string[] }`
- **Output:** `{ allowed?: boolean, assignment_id: string | null, assigned_exercise_id: string | null, reason?: string, remaining_assignments: number | null, remaining_swaps: number | null }`
- **Notes:** Persists assignments in `daily_snack_assignments`; idempotent read for existing daily assignment when `swap` is false.


### notifications-plan
- **Purpose:** Return authoritative send/no-send decision for proactive nudges.
- **Input:** `{ now_utc?: string, dry_run?: boolean }`
- **Output:** `{ send_now: boolean, reason: string, nudge_type: string | null, dry_run: boolean, next_eligible_at: string | null }`
- **Notes:** Applies quiet-hours, cap, and tier policy from DB config.

### notifications-feedback
- **Purpose:** Record notification outcomes and engagement events.
- **Input:** `{ event_id: string, action: 'opened' | 'dismissed' | 'snoozed' | 'converted' }`
- **Output:** `{ ok: boolean }`


### notifications-dispatch
- **Purpose:** Scheduled worker endpoint that queues eligible nudge events.
- **Input:** `{}`
- **Output:** `{ queued: number, scanned: number, run_at: string }`
- **Notes:** Uses service role and `notification_preferences` + policy config to enqueue `planned` events.


---

## Direct DB Writes (RLS enforced)

### profiles (preferences update)
- **Write:** `profiles.update`
- **Owner:** user
- **Rationale:** User-owned settings, no metering or billing risk.
- **Constraints:** RLS must ensure `auth.uid() = id`.

### exercise_completions
- **Write:** `exercise_completions.insert`
- **Owner:** user
- **Rationale:** User-owned progress tracking.
- **Constraints:** RLS must ensure `auth.uid() = user_id`.

---

## Conditional / Future Writes (Edge required when enabled)

### exercises (generated content)
- **Write:** `exercises.insert`
- **Owner:** system
- **Status:** currently disabled by `persistGenerated = false`.
- **Required:** If enabled, **must be Edge** to validate and attribute generation.

---

## Entitlements Model

### Source of Truth
- `subscriptions` + `plans.entitlements` (with fallback to `profiles.subscription_plan`)

### Entitlements fields (current)
- `daily_exercise_views`
- `can_use_space_analysis`
- `monthly_ai_plans`
- `monthly_exercise_generations`
- `can_export`
- `max_saved_plans`

---

## Data Contracts (Summary)

### Ledger Tables
- `exercise_views (user_id, exercise_id, day_key)`
- `daily_snack_assignments (user_id, day_key, assignment_index, exercise_id, source)`
- `ai_plan_generations (user_id, month_key)`
- `exercise_generations (user_id, month_key)`
- `nudge_event_log (user_id, nudge_type, status, sent_at)`

### Notification Config Tables
- `notification_preferences (user_id, push_enabled, quiet_start_local, quiet_end_local, reminder_window, max_daily_notifications_override)`
- `notification_policy_config (id='global', max_daily_notifications_free, max_daily_notifications_premium, ignored_backoff_threshold, ignored_backoff_daily_cap)`

### RLS Requirements
- `profiles`: select/update own only
- `exercise_completions`: insert/select own only
- ledgers: insert/select own only

---

## Next API-minded Enhancements
- Move **plan upgrades** and **subscription changes** to Edge.
- Add **server-side validation** for preference updates (optional).
- Add **rate limiting** for auth and LLM endpoints.
