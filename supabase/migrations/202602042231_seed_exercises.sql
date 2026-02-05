-- Seed exercises data

insert into public.exercises (title, duration_minutes, intensity, equipment, instructions, tips, category)
select
  'Desk-Side Stretching Sequence',
  5,
  'low',
  array['None / Bodyweight Only'],
  array['Stand behind your chair', 'Reach arms overhead for 30 seconds', 'Side bends - 10 each side', 'Gentle torso twists', 'Neck rolls - 5 each direction'],
  'Perfect for between meetings. No changing required.',
  'Mobility'
where not exists (
  select 1 from public.exercises where title = 'Desk-Side Stretching Sequence'
);

insert into public.exercises (title, duration_minutes, intensity, equipment, instructions, tips, category)
select
  'Standing Leg Activators',
  7,
  'low',
  array['Chair'],
  array['Use chair for balance if needed', 'Calf raises - 15 reps', 'Single leg balance - 30 sec each', 'Gentle leg swings - 10 each direction', 'Standing glute squeezes - 20 reps'],
  'Great for improving circulation during long work sessions.',
  'Strength'
where not exists (
  select 1 from public.exercises where title = 'Standing Leg Activators'
);

insert into public.exercises (title, duration_minutes, intensity, equipment, instructions, tips, category)
select
  'Wall-Assisted Upper Body',
  8,
  'medium',
  array['Wall Space'],
  array['Wall push-ups - 12 reps', 'Wall angels - 15 reps', 'Wall slides - 10 reps', 'Shoulder blade squeezes against wall', 'Chest stretch using doorframe'],
  'Builds upper body strength without equipment.',
  'Strength'
where not exists (
  select 1 from public.exercises where title = 'Wall-Assisted Upper Body'
);
