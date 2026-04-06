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


### notifications-plan
- **Purpose:** Return authoritative send/no-send decision for proactive nudges.
- **Input:** `{ now_utc?: string }`
- **Output:** `{ send_now: boolean, reason: string, nudge_type: string | null, next_eligible_at: string | null }`
- **Notes:** Applies quiet-hours, cap, and tier policy from DB config.

### notifications-feedback
- **Purpose:** Record notification outcomes and engagement events.
- **Input:** `{ event_id: string, action: 'opened' | 'dismissed' | 'snoozed' | 'converted' }`
- **Output:** `{ ok: boolean }`


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
