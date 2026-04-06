create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  timezone text not null default 'UTC',
  quiet_hours_enabled boolean not null default true,
  quiet_start_local time not null default '21:30',
  quiet_end_local time not null default '07:00',
  reminder_window text not null default 'anytime' check (reminder_window in ('anytime', 'morning', 'midday', 'evening')),
  max_daily_notifications_override integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.notification_preferences add column if not exists timezone text not null default 'UTC';

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
on public.notification_preferences for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
on public.notification_preferences for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
on public.notification_preferences for update
to authenticated
using (auth.uid() = user_id);

create table if not exists public.notification_policy_config (
  id text primary key,
  max_daily_notifications_free integer not null default 2,
  max_daily_notifications_premium integer not null default 4,
  ignored_backoff_threshold integer not null default 3,
  ignored_backoff_daily_cap integer not null default 1,
  wake_buffer_minutes integer not null default 45,
  bed_buffer_minutes integer not null default 60,
  quiet_hours_default_enabled boolean not null default true,
  quiet_hours_default_start time not null default '21:30',
  quiet_hours_default_end time not null default '07:00',
  updated_at timestamp with time zone default now()
);

alter table public.notification_policy_config enable row level security;

drop policy if exists "notification_policy_config_select_all" on public.notification_policy_config;
create policy "notification_policy_config_select_all"
on public.notification_policy_config for select
to authenticated
using (true);

insert into public.notification_policy_config (
  id,
  max_daily_notifications_free,
  max_daily_notifications_premium,
  ignored_backoff_threshold,
  ignored_backoff_daily_cap,
  wake_buffer_minutes,
  bed_buffer_minutes,
  quiet_hours_default_enabled,
  quiet_hours_default_start,
  quiet_hours_default_end,
  updated_at
)
values (
  'global',
  2,
  4,
  3,
  1,
  45,
  60,
  true,
  '21:30',
  '07:00',
  now()
)
on conflict (id) do update set
  max_daily_notifications_free = excluded.max_daily_notifications_free,
  max_daily_notifications_premium = excluded.max_daily_notifications_premium,
  ignored_backoff_threshold = excluded.ignored_backoff_threshold,
  ignored_backoff_daily_cap = excluded.ignored_backoff_daily_cap,
  wake_buffer_minutes = excluded.wake_buffer_minutes,
  bed_buffer_minutes = excluded.bed_buffer_minutes,
  quiet_hours_default_enabled = excluded.quiet_hours_default_enabled,
  quiet_hours_default_start = excluded.quiet_hours_default_start,
  quiet_hours_default_end = excluded.quiet_hours_default_end,
  updated_at = now();


create table if not exists public.nudge_event_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nudge_type text not null,
  status text not null,
  reason text,
  created_at timestamp with time zone default now()
);

create index if not exists nudge_event_log_user_created_idx
  on public.nudge_event_log (user_id, created_at desc);

alter table public.nudge_event_log enable row level security;

drop policy if exists "nudge_event_log_select_own" on public.nudge_event_log;
create policy "nudge_event_log_select_own"
on public.nudge_event_log for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "nudge_event_log_insert_own" on public.nudge_event_log;
create policy "nudge_event_log_insert_own"
on public.nudge_event_log for insert
to authenticated
with check (auth.uid() = user_id);
