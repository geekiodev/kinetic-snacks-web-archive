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

insert into public.preference_equipment_options (key, label, sort_order, is_active)
values
  ('doorway_pullup_bar', 'Doorway Pull-up Bar', 10, true),
  ('resistance_bands', 'Resistance Bands', 20, true),
  ('dumbbells', 'Dumbbells', 30, true),
  ('kettlebells', 'Kettlebells', 40, true),
  ('jump_rope', 'Jump Rope', 50, true),
  ('yoga_mat', 'Yoga Mat', 60, true),
  ('chair', 'Chair', 70, true),
  ('countertop', 'Countertop', 80, true),
  ('wall_space', 'Wall Space', 90, true),
  ('floor_space', 'Floor Space', 100, true),
  ('none_bodyweight_only', 'None / Bodyweight Only', 110, true)
on conflict (key) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

