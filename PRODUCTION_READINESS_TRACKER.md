# Production Readiness Tracker

## Verdict (Honest)
Not production ready. The app is a strong prototype with real Supabase data access, but it lacks core production safeguards: test coverage, CI, observability, security hardening, and a real payment/entitlement system. Getting to production is very doable, but requires deliberate work across testing, security, reliability, and operations.

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

## Critical Blockers (Must Fix Before Production)
- [ ] Replace simulated payment flow with a real PSP (Stripe) and server-side entitlements.
- [ ] Add CI pipeline (lint, typecheck, tests, build) with required status checks.
- [ ] Add monitoring + error reporting (Sentry or similar) and remove debug logging to localhost.
- [ ] Implement auth recovery/verification UX: email confirm, password reset, and error states.
- [ ] Add minimum test coverage for auth, onboarding, data reads/writes, and routing.
- [ ] Add environment validation and a secure secrets/config story.

## Security & Compliance
- [ ] Remove debug logging to `http://127.0.0.1` and replace with production-safe logging.
- [ ] Add CSP + security headers (if deployed on a platform, configure headers).
- [ ] Ensure RLS policies are audited and tested (profiles, exercises, completions).
- [ ] Move premium checks server-side (edge function or backend).
- [ ] Implement rate limiting for auth endpoints (Supabase Edge or gateway).
- [ ] Add privacy policy and terms (legal requirement for payments and user data).

## Auth & Identity
- [ ] Password reset flow (UI + Supabase email config).
- [ ] Email confirmation flow (UI + state handling).
- [ ] OAuth providers wired (Google/GitHub buttons currently UI-only).
- [ ] Session persistence hardening (handle refresh token failures).

## Data Integrity & Reliability
- [ ] Add explicit error handling for all DB writes (profiles, completions).
- [ ] Add DB constraints for critical tables (e.g., non-null, FK).
- [ ] Add automated backups and migration checks for Supabase.
- [ ] Add retry/backoff for transient Supabase errors.

## Observability
- [ ] Centralized error tracking (Sentry/LogRocket).
- [ ] Request tracing for Supabase calls.
- [ ] Metrics dashboards (auth success rate, onboarding completion, errors).

## Testing
- [x] Unit tests for `validateExerciseCandidate`.
- [x] Auth form validation test (input required errors).
- [ ] Auth integration tests (mocked Supabase session responses).
- [ ] Onboarding flow tests (preferences -> save -> next view).
- [ ] Dashboard data rendering tests (exercises list + stats).
- [ ] E2E tests for login/onboarding/dashboard (Playwright or Cypress).

## CI/CD & Build
- [ ] GitHub Actions: lint, typecheck, test, build.
- [ ] Add build artifacts / preview env for PRs.
- [ ] Add environment config validation on startup.

## UX & Product Readiness
- [ ] Replace simulated exercise generation with actual logic or AI pipeline.
- [ ] Replace simulated space analysis with a real pipeline or remove from prod.
- [ ] Add empty/error states for all critical views.

## Notes / Decisions
- Target deployment platform: TBD (Vercel/Netlify/Supabase hosting).
- Backend strategy: Supabase only vs. add server/edge functions.
