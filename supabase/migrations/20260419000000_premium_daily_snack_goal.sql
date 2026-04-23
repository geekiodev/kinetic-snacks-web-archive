-- Add configurable daily snack goal for premium users to notification_policy_config.
-- This replaces the hardcoded PREMIUM_DAILY_GOAL = 5 in allow-snack-assignment.
-- Adjust via Supabase table editor on the 'global' row — no deploy needed.

alter table public.notification_policy_config
  add column if not exists premium_daily_snack_goal integer not null default 5;
