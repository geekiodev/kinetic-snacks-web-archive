-- Free-tier usage ledger (unique exercise views per day)
create table if not exists public.exercise_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  day_key date not null,
  viewed_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique (user_id, exercise_id, day_key)
);

create index if not exists exercise_views_user_day_idx
  on public.exercise_views (user_id, day_key);

alter table public.exercise_views enable row level security;

drop policy if exists "exercise_views_select_own" on public.exercise_views;
drop policy if exists "exercise_views_insert_own" on public.exercise_views;

create policy "exercise_views_select_own"
on public.exercise_views for select
to authenticated
using (auth.uid() = user_id);

create policy "exercise_views_insert_own"
on public.exercise_views for insert
to authenticated
with check (auth.uid() = user_id);
