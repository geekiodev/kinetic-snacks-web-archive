-- Limitation rules table + policies + seed data

create table if not exists public.limitation_rules (
  id uuid primary key default gen_random_uuid(),
  limitation_key text not null,
  keywords text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.limitation_rules enable row level security;

drop policy if exists "limitation_rules_select_all" on public.limitation_rules;
drop policy if exists "limitation_rules_admin_insert" on public.limitation_rules;
drop policy if exists "limitation_rules_admin_update" on public.limitation_rules;
drop policy if exists "limitation_rules_admin_delete" on public.limitation_rules;

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

insert into public.limitation_rules (limitation_key, keywords)
select 'Knee Issues', array['jump', 'lunge', 'squat', 'burpee', 'knee']
where not exists (
  select 1 from public.limitation_rules where limitation_key = 'Knee Issues'
);

insert into public.limitation_rules (limitation_key, keywords)
select 'Back Pain', array['deadlift', 'toe touch', 'forward fold', 'good morning', 'twist']
where not exists (
  select 1 from public.limitation_rules where limitation_key = 'Back Pain'
);

insert into public.limitation_rules (limitation_key, keywords)
select 'Shoulder Injury', array['overhead', 'press', 'push-up', 'plank', 'shoulder']
where not exists (
  select 1 from public.limitation_rules where limitation_key = 'Shoulder Injury'
);

insert into public.limitation_rules (limitation_key, keywords)
select 'Wrist Problems', array['plank', 'push-up', 'burpee', 'handstand']
where not exists (
  select 1 from public.limitation_rules where limitation_key = 'Wrist Problems'
);

insert into public.limitation_rules (limitation_key, keywords)
select 'Ankle Issues', array['jump', 'hop', 'skip', 'ankle']
where not exists (
  select 1 from public.limitation_rules where limitation_key = 'Ankle Issues'
);

insert into public.limitation_rules (limitation_key, keywords)
select 'Hip Pain', array['lunge', 'squat', 'hip hinge', 'hip']
where not exists (
  select 1 from public.limitation_rules where limitation_key = 'Hip Pain'
);
