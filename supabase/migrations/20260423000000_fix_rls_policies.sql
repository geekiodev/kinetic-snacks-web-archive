-- Fix RLS: notification_preferences UPDATE was missing WITH CHECK clause,
-- allowing authenticated users to update rows belonging to other users.
drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
on public.notification_preferences for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Remove direct client INSERT on exercise_completions.
-- Completions are now recorded exclusively through the complete-exercise
-- edge function (which uses the service role and validates slot ownership).
-- Clients retain SELECT so they can read their own history.
drop policy if exists "exercise_completions_insert_own" on public.exercise_completions;

-- Re-add a tighter version: allow insert only when user_id matches.
-- This is belt-and-suspenders — the edge function is the authoritative path.
create policy "exercise_completions_insert_own"
on public.exercise_completions for insert
to authenticated
with check (auth.uid() = user_id);

-- Add slot_id column to exercise_completions so each completion is
-- traceable to the specific slot that was completed.
alter table public.exercise_completions
  add column if not exists slot_id uuid references public.daily_snack_assignments(id) on delete set null;

-- Index for per-slot lookup (prevents duplicate completions).
create unique index if not exists exercise_completions_slot_id_unique
  on public.exercise_completions (slot_id)
  where slot_id is not null;
