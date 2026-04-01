insert into public.exercises (
  title, duration_minutes, intensity, equipment, instructions, tips, category,
  movement_tags, body_region_tags, context_tags, location_tags, contraindication_tags,
  requires_floor, standing_only, no_sweat, variation_key
)
select *
from (
values
  (
    'Kettlebell Hinge Primer',
    8,
    'medium',
    array['Kettlebells'],
    array['Stand with feet shoulder-width apart', 'Hinge at the hips and guide the kettlebell to mid-shin', 'Drive through your feet to stand tall', 'Complete 8 reps for 3 rounds'],
    'A concise hinge-focused strength snack for kettlebell days.',
    'Strength',
    array['hip_hinge'],
    array['hips_glutes', 'core'],
    array['home_friendly'],
    array['Living Room', 'Gym'],
    array['Back Pain'],
    false,
    true,
    false,
    'kettlebell-hinge-primer'
  ),
  (
    'Jump Rope Rhythm Builder',
    6,
    'medium',
    array['Jump Rope'],
    array['Jump rope for 30 seconds at a steady pace', 'Recover for 20 seconds', 'Repeat 6 rounds', 'Finish with calf stretches for 20 seconds per side'],
    'Builds quick cardio capacity in a short, repeatable interval block.',
    'Activation',
    array['cardio'],
    array['ankles_calves', 'cardio_endurance'],
    array['home_friendly', 'outdoor_friendly'],
    array['Outdoor Space', 'Gym', 'Living Room'],
    array['Ankle Issues'],
    false,
    true,
    false,
    'jump-rope-rhythm-builder'
  )
) as seed (
  title, duration_minutes, intensity, equipment, instructions, tips, category,
  movement_tags, body_region_tags, context_tags, location_tags, contraindication_tags,
  requires_floor, standing_only, no_sweat, variation_key
)
where not exists (
  select 1 from public.exercises existing where existing.title = seed.title
);

