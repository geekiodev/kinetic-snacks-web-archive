# Knowledge Base Setup Guide for New Projects

**Purpose:** Step-by-step instructions to set up a living knowledge base system in a new project, using the same strategy from the Household Ecosystem project.

---

## 📋 Step-by-Step Setup Instructions

Copy and paste these instructions to Cursor when setting up a new project.

---

### **Step 1: Copy Template Files**

```
Please copy the knowledge base template and supporting files from my shared location to this project:

1. Copy `/Users/geekio/Dev/Foundational Dev Docs/KNOWLEDGE_BASE_TEMPLATE.md` to `KNOWLEDGE_BASE.md` in the project root
2. Copy `/Users/geekio/Dev/Foundational Dev Docs/SHARED_FLUTTER_PATTERNS.md` to `SHARED_FLUTTER_PATTERNS.md` in the project root (for reference)
3. Create `KNOWLEDGE_BASE_UPDATE_CHECKLIST.md` in the project root with the checklist content (see below)
4. Create `KNOWLEDGE_BASE_QUICK_REF.md` in the project root (optional, for quick reference patterns)
5. Create `KNOWLEDGE_BASE_ARCHIVE.md` in the project root (for archiving when main file grows too large)
```

---

### **Step 2: Customize the Knowledge Base**

```
Please customize the KNOWLEDGE_BASE.md file:

1. Replace `[Project Name]` with the actual project name
2. Update the "Last Updated" date to today's date
3. Add initial architecture description in the "Architecture Evolution" section
4. Add any initial decisions or learnings if applicable
```

---

### **Step 3: Create Update Checklist File**

Create `KNOWLEDGE_BASE_UPDATE_CHECKLIST.md` with this content:

```markdown
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
```

---

### **Step 4: Create .cursorrules File**

Create `.cursorrules` in the project root with this content (customize project-specific parts):

```markdown
# Cursor Rules for [Project Name]

## Knowledge Base Maintenance

**🚨 CRITICAL: This is a LIVING DOCUMENT that MUST be updated after EVERY significant work session**

**⚠️ BEFORE COMMITTING OR CREATING PR - CHECK THIS CHECKLIST:**

### ✅ Knowledge Base Update Checklist

After completing ANY significant work (features, bug fixes, decisions, experiments), you MUST:

1. **Update `KNOWLEDGE_BASE.md`:**
   - [ ] Update "Last Updated" date at the top (format: YYYY-MM-DD - Feature Name)
   - [ ] Add entry to "Update Log" section with date and feature name
   - [ ] Add new learnings to "Quick Reference: Key Learnings" section
   - [ ] Add new anti-patterns to "What Doesn't Work / Anti-Patterns" section
   - [ ] Add bugs and their fixes to "Major Bugs & Fixes" section
   - [ ] Add new lessons to "Lessons Learned Summary" section

2. **When to update (update if ANY of these apply):**
   - [ ] New features implemented
   - [ ] Bugs fixed
   - [ ] Architecture decisions made
   - [ ] Experiments tried (successful or failed)
   - [ ] Performance issues discovered
   - [ ] User feedback incorporated
   - [ ] UI/UX changes made
   - [ ] Platform-specific code added

3. **File management:**
   - [ ] Keep `KNOWLEDGE_BASE.md` under ~500 lines (archive if needed)
   - [ ] Move verbose details to `KNOWLEDGE_BASE_ARCHIVE.md` when main file grows too large
   - [ ] Update `KNOWLEDGE_BASE_QUICK_REF.md` with new patterns if applicable

**🔴 DO NOT COMMIT OR CREATE PR UNTIL KNOWLEDGE BASE IS UPDATED**

**This is not optional - it's part of the development process. Missing updates means losing valuable insights.**

## Code Style

[Add your project-specific code style rules here]

## Testing

[Add your project-specific testing guidelines here]
```

---

### **Step 5: Create Optional Quick Reference File**

Create `KNOWLEDGE_BASE_QUICK_REF.md` (optional, for quick lookup):

```markdown
# Knowledge Base - Quick Reference

**Purpose:** Quick lookup for common decisions and patterns. See `KNOWLEDGE_BASE.md` for detailed history.

---

## 🚦 Decision Matrix

[Add project-specific decision matrix as you make decisions]

---

## ⚡ Quick Fixes

[Add common issues and quick fixes as you encounter them]

---

## 🎯 Common Patterns

[Add code patterns that work well in this project]

---

## ❌ Never Do These

[Add anti-patterns specific to this project]

---

## ✅ Always Do These

[Add best practices specific to this project]

---

## 🔍 Debugging Checklist

[Add debugging steps specific to this project]

---

*For detailed history and context, see `KNOWLEDGE_BASE.md`*
```

---

### **Step 6: Create Archive File**

Create `KNOWLEDGE_BASE_ARCHIVE.md` (empty for now, will be used when main file grows):

```markdown
# Knowledge Base Archive

**Purpose:** Archive verbose details from `KNOWLEDGE_BASE.md` when the main file grows too large (>500 lines).

---

## Archived Entries

[Move detailed bug reports, long architecture discussions, and verbose experiment notes here]

---

*See `KNOWLEDGE_BASE.md` for current learnings and quick reference*
```

---

## 🎯 Usage Workflow

### **During Development:**

1. **Work on feature/bug fix**
2. **Before committing:**
   - Open `KNOWLEDGE_BASE_UPDATE_CHECKLIST.md`
   - Go through the checklist
   - Update `KNOWLEDGE_BASE.md` with:
     - New learnings
     - Anti-patterns discovered
     - Bugs fixed
     - Architecture decisions
     - Update log entry
3. **Commit changes** (including knowledge base updates)

### **When Knowledge Base Gets Large:**

1. Move verbose details to `KNOWLEDGE_BASE_ARCHIVE.md`
2. Keep only essential learnings in main file
3. Add reference links if needed

### **When Starting New Features:**

1. Check `KNOWLEDGE_BASE.md` for relevant patterns
2. Check `SHARED_FLUTTER_PATTERNS.md` for general Flutter patterns
3. Check `KNOWLEDGE_BASE_QUICK_REF.md` for quick decisions

---

## 📝 Example Update Entry

When updating the knowledge base, use this format:

```markdown
### **2025-01-02 - User Authentication**

- Implemented Supabase Auth with email/password
- Added session persistence using SharedPreferences
- Created AuthProvider for state management

**Key Learning:** Supabase Auth requires explicit session refresh on app resume. Always check session validity before making authenticated requests.

**Files:**
- `lib/services/auth_service.dart`
- `lib/providers/auth_provider.dart`
- `lib/screens/login_screen.dart`
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `KNOWLEDGE_BASE.md` exists and is customized
- [ ] `KNOWLEDGE_BASE_UPDATE_CHECKLIST.md` exists
- [ ] `KNOWLEDGE_BASE_ARCHIVE.md` exists (empty is fine)
- [ ] `.cursorrules` exists with knowledge base maintenance rules
- [ ] `SHARED_FLUTTER_PATTERNS.md` exists (for reference)
- [ ] `KNOWLEDGE_BASE_QUICK_REF.md` exists (optional)

---

## 🚀 Quick Start Command for Cursor

Copy this entire block to Cursor in your new project:

```
I want to set up a living knowledge base system for this project. Please:

1. Copy `/Users/geekio/Dev/Foundational Dev Docs/KNOWLEDGE_BASE_TEMPLATE.md` to `KNOWLEDGE_BASE.md` in this project root
2. Copy `/Users/geekio/Dev/Foundational Dev Docs/SHARED_FLUTTER_PATTERNS.md` to `SHARED_FLUTTER_PATTERNS.md` in this project root
3. Create `KNOWLEDGE_BASE_UPDATE_CHECKLIST.md` with the checklist content from the setup guide
4. Create `KNOWLEDGE_BASE_ARCHIVE.md` (empty for now)
5. Create `KNOWLEDGE_BASE_QUICK_REF.md` with the template from the setup guide
6. Create `.cursorrules` with knowledge base maintenance rules (customize project name)
7. Customize `KNOWLEDGE_BASE.md`:
   - Replace [Project Name] with the actual project name
   - Update "Last Updated" date to today
   - Add initial architecture description

Reference the setup guide at `/Users/geekio/Dev/Foundational Dev Docs/KNOWLEDGE_BASE_SETUP_GUIDE.md` for detailed instructions.
```

---

*This guide ensures your knowledge base becomes a living document that grows with your project and prevents repeating mistakes.*

