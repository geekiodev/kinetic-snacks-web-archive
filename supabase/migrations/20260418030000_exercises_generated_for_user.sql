-- Track which user triggered AI generation of an exercise.
-- Used for audit trail, quality control, and loading a user's
-- most recently generated exercises (e.g. from Space Analysis).

alter table public.exercises
  add column if not exists generated_for_user_id uuid
    references auth.users(id) on delete set null;

-- Allow authenticated users to insert exercises they generated themselves.
-- The edge function runs with the user's JWT so this is the correct gate.
drop policy if exists "exercises_insert_generated" on public.exercises;
create policy "exercises_insert_generated"
  on public.exercises for insert
  to authenticated
  with check (
    generated_for_user_id = auth.uid()
    and source_type = 'generated_template'
  );
