-- Plan entitlements + subscriptions
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

insert into public.plans (name, entitlements)
values
  ('free', '{
    "daily_exercise_views": 3,
    "can_use_space_analysis": false,
    "monthly_ai_plans": 0,
    "monthly_exercise_generations": 0,
    "can_export": false,
    "max_saved_plans": 1
  }'::jsonb),
  ('premium', '{
    "daily_exercise_views": null,
    "can_use_space_analysis": true,
    "monthly_ai_plans": null,
    "monthly_exercise_generations": null,
    "can_export": true,
    "max_saved_plans": null
  }'::jsonb)
on conflict (name) do update
set entitlements = excluded.entitlements;

insert into public.subscriptions (user_id, plan_id, status)
select p.id, pl.id, 'active'
from public.profiles p
join public.plans pl
  on pl.name = coalesce(p.subscription_plan, 'free')
on conflict (user_id) do nothing;

-- Usage ledgers for metered features
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
