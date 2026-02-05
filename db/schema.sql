-- Kinetic Snacks - Supabase schema and RLS policies
-- Apply in Supabase SQL editor or via migrations.

create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  preferences jsonb,
  subscription_plan text default 'free',
  subscription_status text,
  trial_ends_at timestamp with time zone,
  is_admin boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists preferences jsonb;
alter table public.profiles add column if not exists subscription_plan text default 'free';
alter table public.profiles add column if not exists subscription_status text;
alter table public.profiles add column if not exists trial_ends_at timestamp with time zone;
alter table public.profiles add column if not exists is_admin boolean not null default false;

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id);

create policy "profiles_delete_own"
on public.profiles for delete
to authenticated
using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Exercises catalog
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  duration_minutes integer not null,
  intensity text not null check (intensity in ('low', 'medium', 'high')),
  equipment text[] not null default '{}',
  instructions text[] not null default '{}',
  tips text,
  category text,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.exercises enable row level security;

create policy "exercises_select_all"
on public.exercises for select
to authenticated
using (true);

create policy "exercises_admin_insert"
on public.exercises for insert
to authenticated
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

create policy "exercises_admin_update"
on public.exercises for update
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

create policy "exercises_admin_delete"
on public.exercises for delete
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

-- Exercise completions
create table if not exists public.exercise_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  exercise_id uuid references public.exercises(id),
  duration_minutes integer not null,
  completed_at timestamp with time zone default now()
);

alter table public.exercise_completions enable row level security;

create policy "exercise_completions_select_own"
on public.exercise_completions for select
to authenticated
using (auth.uid() = user_id);

create policy "exercise_completions_insert_own"
on public.exercise_completions for insert
to authenticated
with check (auth.uid() = user_id);

create policy "exercise_completions_delete_own"
on public.exercise_completions for delete
to authenticated
using (auth.uid() = user_id);

-- Space analysis results (optional)
create table if not exists public.space_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  image_url text,
  analysis jsonb,
  created_at timestamp with time zone default now()
);

alter table public.space_analyses enable row level security;

create policy "space_analyses_select_own"
on public.space_analyses for select
to authenticated
using (auth.uid() = user_id);

create policy "space_analyses_insert_own"
on public.space_analyses for insert
to authenticated
with check (auth.uid() = user_id);
