# Kinetic Snacks - Knowledge Base & Decision Journal

**Purpose:** Capture decisions, experiments, bugs, and learnings to improve future development and avoid repeating mistakes.

**⚠️ IMPORTANT: This is a LIVING DOCUMENT**
- **MUST be updated** after each significant feature, bug fix, or decision
- Update the "Last Updated" date and relevant sections
- Add new learnings, patterns, and anti-patterns as discovered
- Archive verbose details to `KNOWLEDGE_BASE_ARCHIVE.md` when main file grows too large

**Last Updated:** 2026-02-03 - Knowledge base setup

---

## 📋 Quick Reference: Key Learnings

### ✅ **What Works Well**
1. Centralized view state in `App.tsx` keeps navigation simple while prototyping.
2. Supabase Auth + profiles table provides a clean user state source.

### ❌ **What Doesn't Work / Anti-Patterns**
1. Relying on local-only state for critical data (subscriptions, completions) leads to lost data on refresh.

### 🎯 **Critical Decisions**
1. Use Supabase Auth + `profiles` for user identity and preferences.
2. Track exercise completions in `exercise_completions` to power streaks and stats.

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

---

### Direct DB Writes (RLS enforced)

#### profiles (preferences update)
- **Write:** `profiles.update`
- **Owner:** user
- **Rationale:** User-owned settings, no metering or billing risk.
- **Constraints:** RLS must ensure `auth.uid() = id`.

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
- `ai_plan_generations (user_id, month_key)`
- `exercise_generations (user_id, month_key)`

#### RLS Requirements
- `profiles`: select/update own only
- `exercise_completions`: insert/select own only
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

### **2026-02-03 - Knowledge base setup**
- Added KB system and Cursor rules
- Documented initial architecture and decisions
- **Key Learning:** Capture decisions early to avoid drift

---

## 🎓 Lessons Learned Summary

1. Keep persistence and auth flows aligned to avoid inconsistent state.

---

## 📚 Related Resources

- Supabase Docs: https://supabase.com/docs

---

*This knowledge base is a living document. Update it after significant work.*
