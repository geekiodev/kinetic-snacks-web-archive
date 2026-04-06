# Kinetic Snacks - Knowledge Base & Decision Journal

**Purpose:** Capture decisions, experiments, bugs, and learnings to improve future development and avoid repeating mistakes.

**⚠️ IMPORTANT: This is a LIVING DOCUMENT**
- **MUST be updated** after each significant feature, bug fix, or decision
- Update the "Last Updated" date and relevant sections
- Add new learnings, patterns, and anti-patterns as discovered
- Archive verbose details to `KNOWLEDGE_BASE_ARCHIVE.md` when main file grows too large

**Last Updated:** 2026-04-06 - Backend-authoritative autopilot assignment + swap metering

---

## 📋 Quick Reference: Key Learnings

### ✅ **What Works Well**
1. Centralized view state in `App.tsx` keeps navigation simple while prototyping.
2. Supabase Auth + profiles table provides a clean user state source.
3. Typed notification defaults and `normalizeNotificationSettings()` keep client state aligned with DB defaults and invalid input out of writes.

### ❌ **What Doesn't Work / Anti-Patterns**
1. Relying on local-only state for critical data (subscriptions, completions) leads to lost data on refresh.

### 🎯 **Critical Decisions**
1. Use Supabase Auth + `profiles` for user identity and preferences.
2. Track exercise completions in `exercise_completions` to power streaks and stats.
3. Shift toward an autopilot recommendation path (assigned snack + notification) to reduce decision fatigue, with free-tier limits based on assignments/swaps rather than browsing views.

---

## 🏗️ Architecture Evolution

## 🔌 API Surface Specification

This section mirrors `docs/API_SURFACE.md`.

### Principles
- **Edge required** for entitlements, metering, paid features, and system-owned data.
- **DB direct** only for user-owned data with strong RLS and no monetization risk.
- **All writes** must be RLS-protected, validated, and auditable.

---

### Edge Functions (Authoritative)

#### allow-exercise-view
- **Purpose:** Enforce free-tier exercise view limits.
- **Input:** `{ exercise_id: string }`
- **Output:** `{ allowed: boolean, remaining: number | null, limit: number | null }`
- **Notes:** Writes to `exercise_views` ledger when allowed.

#### allow-space-analysis
- **Purpose:** Enforce premium access for space analysis.
- **Input:** `{}`
- **Output:** `{ allowed: boolean }`

#### allow-ai-plan-generation
- **Purpose:** Meter AI plan generation.
- **Input:** `{}`
- **Output:** `{ allowed: boolean, remaining: number | null, limit: number | null }`
- **Notes:** Writes to `ai_plan_generations` ledger when allowed.

#### allow-exercise-generation
- **Purpose:** Meter exercise generation (LLM usage).
- **Input:** `{}`
- **Output:** `{ allowed: boolean, remaining: number | null, limit: number | null }`
- **Notes:** Writes to `exercise_generations` ledger when allowed.

#### allow-export
- **Purpose:** Enforce export entitlement.
- **Input:** `{}`
- **Output:** `{ allowed: boolean }`

#### allow-snack-assignment
- **Purpose:** Authoritative daily snack assignment + manual swap metering.
- **Input:** `{ day_key?: string, swap?: boolean, candidate_exercise_ids: string[] }`
- **Output:** `{ allowed?: boolean, assignment_id: string | null, assigned_exercise_id: string | null, reason?: string, remaining_assignments: number | null, remaining_swaps: number | null }`
- **Notes:** Writes to `daily_snack_assignments`; returns existing assignment for idempotent non-swap calls.

#### notifications-plan
- **Purpose:** Authoritative send/no-send for proactive nudges (quiet hours, caps, tier policy from DB config).
- **Input:** `{ now_utc?: string, dry_run?: boolean }`
- **Output:** `{ send_now: boolean, reason: string, nudge_type: string | null, dry_run: boolean, next_eligible_at: string | null }`
- **Notes:** Shared decision logic lives in `supabase/functions/notifications-plan/usageLogic.ts` (unit-tested).

#### notifications-feedback
- **Purpose:** Record notification outcomes (opened, dismissed, snoozed, converted).
- **Input:** `{ event_id: string, action: 'opened' | 'dismissed' | 'snoozed' | 'converted' }`
- **Output:** `{ ok: boolean }`

#### notifications-dispatch
- **Purpose:** Scheduled worker that scans eligible users and queues `planned` nudge events (service role).
- **Input:** `{}`
- **Output:** `{ queued: number, scanned: number, run_at: string }`
- **Notes:** Uses `notification_preferences` + `notification_policy_config`; imports decision helpers from `notifications-plan/usageLogic.ts`.

---

### Direct DB Writes (RLS enforced)

#### profiles (preferences update)
- **Write:** `profiles.update`
- **Owner:** user
- **Rationale:** User-owned settings, no metering or billing risk.
- **Constraints:** RLS must ensure `auth.uid() = id`.

#### notification_preferences
- **Write:** `notification_preferences.insert` / `notification_preferences.update`
- **Owner:** user
- **Rationale:** User-owned quiet hours, reminder window, push toggle, optional daily cap override.
- **Constraints:** RLS must ensure `auth.uid() = user_id`; server policy reads `notification_policy_config` for tier caps.

#### exercise_completions
- **Write:** `exercise_completions.insert`
- **Owner:** user
- **Rationale:** User-owned progress tracking.
- **Constraints:** RLS must ensure `auth.uid() = user_id`.

---

### Conditional / Future Writes (Edge required when enabled)

#### exercises (generated content)
- **Write:** `exercises.insert`
- **Owner:** system
- **Status:** currently disabled by `persistGenerated = false`.
- **Required:** If enabled, **must be Edge** to validate and attribute generation.

---

### Entitlements Model

#### Source of Truth
- `subscriptions` + `plans.entitlements` (with fallback to `profiles.subscription_plan`)

#### Entitlements fields (current)
- `daily_exercise_views`
- `can_use_space_analysis`
- `monthly_ai_plans`
- `monthly_exercise_generations`
- `can_export`
- `max_saved_plans`

---

### Data Contracts (Summary)

#### Ledger Tables
- `exercise_views (user_id, exercise_id, day_key)`
- `daily_snack_assignments (user_id, day_key, assignment_index, exercise_id, source)`
- `ai_plan_generations (user_id, month_key)`
- `exercise_generations (user_id, month_key)`
- `nudge_event_log (user_id, nudge_type, status, sent_at)`

#### Notification config
- `notification_preferences`: per-user push, quiet hours (local time), reminder window, optional `max_daily_notifications_override`.
- `notification_policy_config`: singleton-style global row (`id='global'`) for free/premium caps, backoff, wake/bed buffers, default quiet hours.

#### RLS Requirements
- `profiles`: select/update own only
- `exercise_completions`: insert/select own only
- `notification_preferences`: select/insert/update own only
- `notification_policy_config`: read for authenticated (policy details in migration)
- ledgers: insert/select own only

---

### Next API-minded Enhancements
- Move **plan upgrades** and **subscription changes** to Edge.
- Add **server-side validation** for preference updates (optional).
- Add **rate limiting** for auth and LLM endpoints.

### **Initial Architecture (v1)**
- React + Vite + Tailwind UI with view switching in `App.tsx`
- Supabase Auth for sign up/sign in
- `profiles` table stores user preferences
- `exercise_completions` stores completed snack sessions
- Mock exercise library (to be replaced by DB table)

---

## 🐛 Major Bugs & Fixes

### **Bug #1: Supabase signup failure**
**Problem:** `Database error saving new user` during signup  
**Root Cause:** Trigger insert referenced missing `profiles.name` column  
**Fix:** Add `name` column or remove field from trigger  
**Files:** Supabase SQL trigger  
**Lesson:** Keep DB schema aligned with trigger logic

---

## 📝 Update Log

### **2026-04-07 - Profile load 400 / banner fix**
- **Cause:** `profiles` used `.single()` (error when no row); `notification_preferences` select listed `timezone` before a repaired DB had that column → PostgREST 400.
- **Fix:** `maybeSingle()` for profiles; omit `timezone` from read select (still sent on upsert); migration `20260407200000_ensure_notification_preferences_timezone.sql` idempotently adds column. Merged with upstream PR #24 (`PGRST116` guard on profile load).
- **Key Learning:** If a migration file is edited after it was applied remotely, add a new migration for deltas instead of relying on a re-run.

### **2026-04-06 - Snack autopilot workflow proposal**
- **Decision artifact:** Added `docs/SNACK_AUTOPILOT_WORKFLOW.md` to define the low-friction workflow where the system assigns and nudges one snack instead of requiring user selection from a list.
- **Entitlement strategy:** Proposed moving free-tier guardrails from `daily_exercise_views` toward assignment-centric limits (`daily_assigned_snacks` + `daily_manual_swaps`) so core autopilot value does not burn browse quota.
- **Policy alignment:** Recommendation keeps notification caps and assignment caps synchronized to prevent contradictory states.
- **Key Learning:** When UX shifts from browsing to automation, monetization controls must shift from "views" to "actions" to stay intuitive.

### **2026-04-06 - Autopilot quota decrement rules clarified**
- **Clarification:** Explicitly documented which events decrement free daily counters vs which are non-decrementing reads/delivery events.
- **Rule:** New assignment creation (including fallback regeneration) decrements assignment quota; viewing/opening/starting/completing an assigned snack does not.
- **Rule:** Manual user-confirmed swap decrements swap quota; system safety swaps and cancelled swap flows do not.
- **Key Learning:** Entitlement models need event-level accounting rules (creation vs interaction) to prevent hidden quota burn and support user trust.

### **2026-04-06 - Dashboard autopilot assignment UX (v1)**
- **Client UX:** Dashboard now promotes one auto-assigned snack (`exercises[0]`), adds a primary "Start Auto Snack" quick action, and reduces decision load by showing a single auto-picked card.
- **Free-tier behavior:** Opening the assigned snack bypasses browse-view metering checks; free users get one manual swap per session-day view state (`manualSwapsRemaining = 1`) before upgrade prompt copy.
- **QA:** Added UI behavior test to verify assigned-snack start path + free swap exhaustion message.
- **Key Learning:** Progressive rollout can start in client UX first, but server-side assignment/swaps ledgers are still needed for authoritative cross-device enforcement.

### **2026-04-06 - Autopilot assignment moved to Edge authority**
- **Edge:** Added `allow-snack-assignment` with shared quota helpers (`usageLogic.ts`) to enforce assignment/swap limits and persist assignment ledger rows.
- **DB:** Added migration `20260408120000_daily_snack_assignments.sql` (table + RLS policies) to support cross-device, day-scoped assignment history.
- **Client:** Dashboard now requests assignment/swap decisions from Edge (`allow-snack-assignment`) instead of purely local selection/swap state.
- **QA:** Added unit tests for new usage logic and updated Dashboard tests to mock assignment/swap function behavior.
- **Key Learning:** Autopilot UX should be stateless on the client and stateful in Edge + ledger tables for deterministic behavior.

### **2026-04-06 - Notifications (DB, Edge, client)**
- **DB:** `notification_preferences`, `notification_policy_config`, migration `20260406110000_notification_preferences_and_policy.sql` (file was amended after first apply; if the remote was migrated earlier, diff SQL against prod or re-verify objects match repo).
- **Edge:** `notifications-plan` (auth, `dry_run`), `notifications-feedback`, `notifications-dispatch` (service role queue); shared `notifications-plan/usageLogic.ts` + tests.
- **Client:** `notificationSettings.ts`, onboarding/settings, `App`/`Dashboard` wiring and E2E + gating tests.
- **Key Learning:** One `normalizeNotificationSettings()` module for client writes; one `usageLogic` module for plan/dispatch decisions so policy does not fork.

### **2026-02-03 - Knowledge base setup**
- Added KB system and Cursor rules
- Documented initial architecture and decisions
- **Key Learning:** Capture decisions early to avoid drift

---

## 🎓 Lessons Learned Summary

1. Keep persistence and auth flows aligned to avoid inconsistent state.
2. After pulling upstream work, reconcile `KNOWLEDGE_BASE.md` with `docs/API_SURFACE.md` and new migrations so the KB does not lag the repo.

---

## 📚 Related Resources

- Supabase Docs: https://supabase.com/docs

---

*This knowledge base is a living document. Update it after significant work.*
