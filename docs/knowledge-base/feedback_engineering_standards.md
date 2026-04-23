---
name: Engineering Standards and Preferences
description: How the user wants code written — standards, patterns, and things to avoid
type: feedback
---

## No hardcoded secrets or credentials

Never hardcode API keys, URLs, JWTs, or credentials anywhere in code or migrations.

**Why:** User pushed back immediately when I proposed hardcoding the anon key in a SQL migration. "Let's fix this the right way."

**How to apply:** Use Vault for SQL-level secrets (`vault.create_secret(value, name)`). Use environment variables in edge functions. Use `.env` for frontend. If a clean solution isn't immediately obvious, investigate before defaulting to hardcoding.

## No third-party services when first-party exists

**Why:** User had a bad experience with OneSignal for push notifications and explicitly ruled it out. Expo's first-party push notification service solves the same problem without the headache.

**How to apply:** Before recommending a third-party SDK or service, check if the framework/platform has a built-in equivalent. Prefer first-party.

## Enterprise-grade, acquisition-ready code

User wants code written at the level of a distinguished engineer at a big tech company. Every architectural decision should be defensible to an acquirer's technical due diligence.

**How to apply:** Server-side validation, proper RLS, service role for mutations, no business logic in the client, clean separation of concerns.

## No speculative features or abstractions

Build for what exists now. Don't design for hypothetical future requirements.

**Why:** Confirmed repeatedly throughout sessions — user wants to ship, not over-engineer.

## Vault secret argument order

`vault.create_secret(secret_value, name)` — value is the FIRST argument, name is the SECOND.

**Why:** Got this backwards in a migration causing 0 rows returned from vault queries. Correct order verified on 2026-04-23.
