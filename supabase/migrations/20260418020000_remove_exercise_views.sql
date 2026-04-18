-- Remove the exercise-view gating system. It was replaced by the slot-based
-- scheduling system (daily_snack_slots). The allow-exercise-view edge function
-- is no longer called by the frontend and has been deleted.

-- 1. Drop the exercise_views tracking table.
drop table if exists public.exercise_views;

-- 2. Strip daily_exercise_views from plan entitlements JSONB.
update public.plans
  set entitlements = entitlements - 'daily_exercise_views'
  where entitlements ? 'daily_exercise_views';
