# Knowledge Base Update Checklist

**Use this checklist BEFORE every commit/PR to ensure knowledge base is updated.**

## Quick Checklist

- [ ] Updated "Last Updated" date in `KNOWLEDGE_BASE.md`
- [ ] Added entry to "Update Log" section
- [ ] Added new learnings to "Quick Reference: Key Learnings"
- [ ] Added new anti-patterns (if any)
- [ ] Added bugs and fixes (if any)
- [ ] Added new lessons learned (if any)

## What Counts as "Significant Work"?

Update the knowledge base if you:
- ✅ Implemented a new feature
- ✅ Fixed a bug
- ✅ Made an architecture decision
- ✅ Tried an experiment (successful or failed)
- ✅ Discovered a performance issue
- ✅ Incorporated user feedback
- ✅ Made UI/UX changes
- ✅ Added platform-specific code
- ✅ **Synced the repo** from remote (pull/merge) and received new migrations, Edge functions, or user-facing behavior — reconcile `KNOWLEDGE_BASE.md` with `docs/API_SURFACE.md` and new SQL so the KB matches mainline

## Update Format

### Update Log Entry Format:
```
### **YYYY-MM-DD - Feature Name**
- What was implemented
- Key technical details
- **Key Learning:** Important insight
```

### Bug Entry Format:
```
### **Bug #N: Bug Name**
**Problem:** Description
**Root Cause:** Explanation
**Fix:** Solution
**Files:** List of files
**Lesson:** What we learned
```

### Anti-Pattern Entry Format:
```
N. **Description** - Why it doesn't work
```

## Remember

- **This is not optional** - Missing updates means losing valuable insights
- **Update immediately** - Don't wait until later, you'll forget details
- **Be specific** - Include file names, code patterns, and lessons learned
- **Archive when needed** - Keep main file under ~500 lines
