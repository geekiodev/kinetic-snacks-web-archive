-- Evolve daily_snack_assignments into a proper slot scheduling table.
-- Each row now represents a planned slot in the user's day, with a scheduled
-- delivery time and lifecycle status. Swap updates the exercise on an existing
-- slot rather than inserting a new row.

-- 1. Add scheduled_at and status to daily_snack_assignments
alter table public.daily_snack_assignments
  add column if not exists scheduled_at timestamptz,
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'notified', 'active', 'completed', 'skipped', 'cancelled'));

-- Backfill existing rows: treat them as already-completed slots with no
-- scheduled time (they predate the scheduling model).
update public.daily_snack_assignments
  set status = 'completed'
  where status = 'pending';

-- Expand source values to include self_initiated (user starts from library).
alter table public.daily_snack_assignments
  drop constraint if exists daily_snack_assignments_source_check;

alter table public.daily_snack_assignments
  add constraint daily_snack_assignments_source_check
  check (source in ('auto', 'manual_swap', 'system_regen', 'self_initiated'));

-- Index for dispatch worker: find pending slots due now.
create index if not exists idx_daily_snack_assignments_pending_scheduled
  on public.daily_snack_assignments (scheduled_at)
  where status = 'pending';

-- Allow Edge functions (acting as the user) to update slot status and exercise.
drop policy if exists "daily_snack_assignments_update_own" on public.daily_snack_assignments;
create policy "daily_snack_assignments_update_own"
  on public.daily_snack_assignments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Add scheduling config to notification_policy_config.
-- min_minutes_between_snacks controls spacing when the system plans a day's slots.
-- A short value (e.g. 5) is useful for demos at high daily_snack_slots limits.
alter table public.notification_policy_config
  add column if not exists min_minutes_between_snacks_free integer not null default 90,
  add column if not exists min_minutes_between_snacks_premium integer not null default 60;

update public.notification_policy_config
  set
    min_minutes_between_snacks_free = 90,
    min_minutes_between_snacks_premium = 60
  where id = 'global';

-- 3. Add daily_snack_slots and daily_swap_slots to plan entitlements.
-- daily_snack_slots replaces daily_exercise_views as the snack assignment quota.
-- daily_exercise_views is kept for the allow-exercise-view function.
update public.plans
  set entitlements = entitlements
    || jsonb_build_object(
         'daily_snack_slots',
         case name
           when 'premium' then null::text
           else (entitlements->>'daily_exercise_views')
         end
       )
    || jsonb_build_object(
         'daily_swap_slots',
         case name
           when 'premium' then null::text
           else '1'
         end
       )
  where name in ('free', 'premium');
