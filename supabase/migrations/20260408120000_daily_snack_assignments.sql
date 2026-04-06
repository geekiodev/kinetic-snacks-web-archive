create table if not exists public.daily_snack_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_key date not null,
  assignment_index integer not null check (assignment_index > 0),
  exercise_id text not null,
  source text not null check (source in ('auto', 'manual_swap', 'system_regen')),
  created_at timestamptz not null default now(),
  unique (user_id, day_key, assignment_index)
);

create index if not exists idx_daily_snack_assignments_user_day
  on public.daily_snack_assignments (user_id, day_key desc, assignment_index desc);

alter table public.daily_snack_assignments enable row level security;

drop policy if exists "daily_snack_assignments_select_own" on public.daily_snack_assignments;
create policy "daily_snack_assignments_select_own"
  on public.daily_snack_assignments
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "daily_snack_assignments_insert_own" on public.daily_snack_assignments;
create policy "daily_snack_assignments_insert_own"
  on public.daily_snack_assignments
  for insert
  to authenticated
  with check (auth.uid() = user_id);
