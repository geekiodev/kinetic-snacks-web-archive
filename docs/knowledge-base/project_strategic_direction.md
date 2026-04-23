---
name: Strategic Direction
description: Business goals, platform strategy, and acquisition positioning for Kinetic Snacks
type: project
---

## Business Objectives

- Launch today, generate revenue immediately
- Position for acquisition once traction is established
- Every decision should produce a metric or clean up technical debt — nothing speculative

**Why:** User stated these as the singular focus on 2026-04-23.

**How to apply:** Prioritise revenue-generating features and clean architecture over speculative features. Avoid scope creep.

## Platform Strategy

**Decision:** Expo (React Native) for iOS, Android, and web from a single codebase.

**Why Expo over Capacitor:**
- Capacitor is WebView-based — push notifications require third-party (OneSignal) which user had bad experience with
- Expo Push Notifications are first-party, simple, no third-party required
- Expo has web target built in (`npx expo export --platform web`)
- User explicitly ruled out OneSignal

**Why Expo over PWA:**
- App Store presence matters for fitness category discoverability
- Native push notifications are the core value prop
- Health app integration (Apple Health / Google Fit) is a natural premium differentiator

**Current state (2026-04-23):** Web app (React/Vite) is the working reference implementation. Expo rewrite is the next mission on branch `feature/expo-migration`.

## Payment Strategy

- **Web:** RevenueCat with Stripe integration
- **iOS/Android:** RevenueCat wrapping Apple IAP / Google Play Billing
- **One SDK, all platforms** — RevenueCat unifies subscription status across web and native
- Delete `PaymentModal.tsx` — custom card form is fake and a PCI liability
- `$4.99/month` with 7-day free trial

## Acquisition Positioning

What acquirers will look at:
- MRR (real Stripe/RevenueCat dashboard)
- Retention metrics (DAU, snack completion rate via PostHog/Mixpanel)
- Clean Supabase + edge functions architecture
- Defensible data: exercise library, user preferences, completion history
- Revenue per user

## Archive Repo

`geekiodev/kinetic-snacks-web-archive` — production-ready web app snapshot before Expo migration. Pushed on 2026-04-23. Use as reference implementation for the Expo rewrite.
