---
name: Expo Migration Plan
description: Plan and context for the React Native / Expo rewrite of the Kinetic Snacks web app
type: project
---

## Current State (2026-04-23)

- Branch: `feature/expo-migration` (off main, clean)
- Reference implementation: `geekiodev/kinetic-snacks-web-archive` (web app, fully working)
- Backend: 100% reusable — all Supabase edge functions, migrations, and schemas carry over untouched

## What Gets Rewritten

Only the UI layer. Everything else stays:
- Supabase client calls
- Edge function calls
- Business logic in `src/lib/` (exerciseValidation, notificationSettings, etc.) — adapted, not rewritten
- All backend (edge functions, migrations, DB schema)

## Tech Stack Decisions

- **Framework:** Expo (managed workflow)
- **Navigation:** Expo Router (file-based, like Next.js)
- **Styling:** NativeWind (Tailwind syntax for React Native)
- **Payments:** RevenueCat — handles Stripe (web), Apple IAP (iOS), Google Play (Android) from one SDK
- **Push notifications:** Expo Push Notifications (first-party, no OneSignal)
- **Health integration:** `@capacitor-community/health-kit` / `@capacitor-community/health-connect` (future phase)

## Screens to Build

1. Auth (login/signup/forgot-password)
2. Onboarding flow
3. Pricing + RevenueCat purchase
4. Dashboard (most complex — premium timeline, free slots, Surprise Me, quick actions)
5. Exercise Detail + timer
6. Space Analysis
7. Settings + Profile

## Revenue Model in Expo

- Web upgrades: RevenueCat web SDK (`@revenuecat/purchases-js`) + Stripe
- iOS upgrades: RevenueCat → Apple IAP (required by App Store rules)
- Android upgrades: RevenueCat → Google Play Billing (required by Play Store rules)
- All subscription status unified in one RevenueCat dashboard

## App Store Requirements

- Apple Developer account ($99/year) — needed before submission
- Google Play Console ($25 one-time) — needed before submission
- Apple review: 1-3 days for new apps
- Google Play review: 1-3 days

**How to apply:** Do not promise App Store launch on the same day as build completion. Web (Expo web target) can launch same day; native stores take review time.
