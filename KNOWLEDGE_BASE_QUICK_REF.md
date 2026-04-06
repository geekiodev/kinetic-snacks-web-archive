# Knowledge Base - Quick Reference

**Purpose:** Quick lookup for common decisions and patterns. See `KNOWLEDGE_BASE.md` for detailed history.

---

## 🚦 Decision Matrix

- Prefer DB-backed state for anything user-visible after refresh (streaks, subscription, preferences).
- Use Supabase RLS for all user-owned tables.

---

## ⚡ Quick Fixes

- "Database error saving new user": check Supabase trigger + profile schema.

---

## 🎯 Common Patterns

- Store user preferences in `profiles.preferences` (jsonb)
- Store completions in `exercise_completions`
- Notification UX and persistence: `notification_preferences` (Supabase) + `normalizeNotificationSettings()` in `src/lib/notificationSettings.ts` before read/write
- Nudge send decisions and engagement: Edge `notifications-plan` / `notifications-feedback` (see `docs/API_SURFACE.md`)

---

## ❌ Never Do These

- Store subscription state only in React state.

---

## ✅ Always Do These

- Update knowledge base after significant work (including after pulling or merging upstream changes that add features, migrations, or API surface).
- Add RLS policies for new tables.

---

## 🔍 Debugging Checklist

- Verify `.env` keys for Supabase are present.
- Check Supabase logs for auth/database errors.

---

*For detailed history and context, see `KNOWLEDGE_BASE.md`*
