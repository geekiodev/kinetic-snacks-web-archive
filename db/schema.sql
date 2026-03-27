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
  movement_tags text[] not null default '{}',
  body_region_tags text[] not null default '{}',
  context_tags text[] not null default '{}',
  location_tags text[] not null default '{}',
  contraindication_tags text[] not null default '{}',
  requires_floor boolean not null default false,
  standing_only boolean not null default false,
  no_sweat boolean not null default true,
  variation_key text,
  source_type text not null default 'curated_seed' check (source_type in ('curated_seed', 'generated_template', 'reviewed_generated')),
  review_status text not null default 'approved' check (review_status in ('approved', 'pending', 'rejected')),
  reviewed_at timestamp with time zone,
  reviewed_by text,
  review_notes text,
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

-- Exercise views (free-tier usage ledger)
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

create policy "exercise_views_select_own"
on public.exercise_views for select
to authenticated
using (auth.uid() = user_id);

create policy "exercise_views_insert_own"
on public.exercise_views for insert
to authenticated
with check (auth.uid() = user_id);

-- Plans and subscriptions (entitlements)
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  entitlements jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text default 'active',
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "plans_select_all" on public.plans;
create policy "plans_select_all"
on public.plans for select
to authenticated
using (true);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions for select
to authenticated
using (auth.uid() = user_id);

-- Usage ledgers (metered entitlements)
create table if not exists public.ai_plan_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key date not null,
  created_at timestamp with time zone default now()
);

create index if not exists ai_plan_generations_user_month_idx
  on public.ai_plan_generations (user_id, month_key);

alter table public.ai_plan_generations enable row level security;

drop policy if exists "ai_plan_generations_select_own" on public.ai_plan_generations;
drop policy if exists "ai_plan_generations_insert_own" on public.ai_plan_generations;

create policy "ai_plan_generations_select_own"
on public.ai_plan_generations for select
to authenticated
using (auth.uid() = user_id);

create policy "ai_plan_generations_insert_own"
on public.ai_plan_generations for insert
to authenticated
with check (auth.uid() = user_id);

create table if not exists public.exercise_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key date not null,
  created_at timestamp with time zone default now()
);

create index if not exists exercise_generations_user_month_idx
  on public.exercise_generations (user_id, month_key);

alter table public.exercise_generations enable row level security;

drop policy if exists "exercise_generations_select_own" on public.exercise_generations;
drop policy if exists "exercise_generations_insert_own" on public.exercise_generations;

create policy "exercise_generations_select_own"
on public.exercise_generations for select
to authenticated
using (auth.uid() = user_id);

create policy "exercise_generations_insert_own"
on public.exercise_generations for insert
to authenticated
with check (auth.uid() = user_id);

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

-- Preference equipment options
create table if not exists public.preference_equipment_options (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null unique,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.preference_equipment_options enable row level security;

drop policy if exists "preference_equipment_options_select_all" on public.preference_equipment_options;
create policy "preference_equipment_options_select_all"
on public.preference_equipment_options for select
to authenticated
using (true);

-- Limitation rules
create table if not exists public.limitation_rules (
  id uuid primary key default gen_random_uuid(),
  limitation_key text not null,
  keywords text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.limitation_rules enable row level security;

create policy "limitation_rules_select_all"
on public.limitation_rules for select
to authenticated
using (true);

create policy "limitation_rules_admin_insert"
on public.limitation_rules for insert
to authenticated
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

create policy "limitation_rules_admin_update"
on public.limitation_rules for update
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

create policy "limitation_rules_admin_delete"
on public.limitation_rules for delete
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

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
