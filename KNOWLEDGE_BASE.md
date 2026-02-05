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
