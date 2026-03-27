insert into public.exercises (
  title, duration_minutes, intensity, equipment, instructions, tips, category,
  movement_tags, body_region_tags, context_tags, location_tags, contraindication_tags,
  requires_floor, standing_only, no_sweat, variation_key
)
select *
from (
values
  (
    'Kettlebell Front Rack March',
    7,
    'medium',
    array['Kettlebells'],
    array['Hold one kettlebell in a front rack position', 'March in place for 30 seconds', 'Switch sides', 'Repeat 4 rounds'],
    'Builds trunk stability and posture with low setup overhead.',
    'Activation',
    array['core', 'gait_or_march'],
    array['core', 'shoulders'],
    array['home_friendly', 'small_space'],
    array['Home Office', 'Living Room', 'Gym'],
    array['Shoulder Injury'],
    false,
    true,
    false,
    'kettlebell-front-rack-march'
  ),
  (
    'Kettlebell Goblet Sit-to-Stand',
    10,
    'medium',
    array['Kettlebells'],
    array['Hold a kettlebell at chest height', 'Sit back to a chair or bench touch', 'Stand with control', 'Complete 8 reps for 3 rounds'],
    'A controlled lower-body strength snack with clear form anchors.',
    'Strength',
    array['squat_pattern'],
    array['hips_glutes', 'knees', 'core'],
    array['home_friendly'],
    array['Living Room', 'Gym'],
    array['Knee Issues', 'Hip Pain'],
    false,
    true,
    false,
    'kettlebell-goblet-sit-stand'
  ),
  (
    'Single-Kettlebell Row Ladder',
    8,
    'medium',
    array['Kettlebells'],
    array['Hinge with one hand supported on a chair', 'Row the kettlebell for 10 reps', 'Switch sides', 'Repeat 3 rounds'],
    'Adds upper-back strength in a compact, unilateral format.',
    'Strength',
    array['upper_pull', 'hip_hinge'],
    array['shoulders', 'thoracic_spine', 'core'],
    array['home_friendly'],
    array['Home Office', 'Living Room', 'Gym'],
    array['Back Pain', 'Shoulder Injury'],
    false,
    true,
    false,
    'single-kettlebell-row-ladder'
  ),
  (
    'Jump Rope Footwork Primer',
    5,
    'medium',
    array['Jump Rope'],
    array['Jump rope for 20 seconds', 'Rest for 15 seconds', 'Repeat 8 rounds', 'Finish with slow nasal breathing'],
    'Quick footwork and rhythm practice for short movement breaks.',
    'Activation',
    array['cardio', 'balance'],
    array['ankles_calves', 'cardio_endurance'],
    array['outdoor_friendly', 'home_friendly'],
    array['Outdoor Space', 'Gym'],
    array['Ankle Issues'],
    false,
    true,
    false,
    'jump-rope-footwork-primer'
  ),
  (
    'Jump Rope Endurance Wave',
    12,
    'medium',
    array['Jump Rope'],
    array['Jump rope for 45 seconds', 'Recover for 20 seconds', 'Repeat 8 rounds', 'Walk and breathe for one minute'],
    'A steady endurance snack when you want sustained cardio in limited time.',
    'Cardio',
    array['cardio'],
    array['cardio_endurance', 'ankles_calves'],
    array['outdoor_friendly'],
    array['Outdoor Space', 'Gym'],
    array['Ankle Issues'],
    false,
    true,
    false,
    'jump-rope-endurance-wave'
  ),
  (
    'Jump Rope Boxer Step Intervals',
    7,
    'medium',
    array['Jump Rope'],
    array['Alternate weight side to side with a boxer step', 'Jump rope for 30 seconds', 'Recover for 20 seconds', 'Repeat 6 rounds'],
    'Lower-impact rhythm option that keeps intensity manageable.',
    'Cardio',
    array['cardio', 'gait_or_march'],
    array['cardio_endurance', 'ankles_calves'],
    array['home_friendly', 'outdoor_friendly'],
    array['Outdoor Space', 'Gym', 'Living Room'],
    array['Ankle Issues'],
    false,
    true,
    false,
    'jump-rope-boxer-step-intervals'
  )
) as seed (
  title, duration_minutes, intensity, equipment, instructions, tips, category,
  movement_tags, body_region_tags, context_tags, location_tags, contraindication_tags,
  requires_floor, standing_only, no_sweat, variation_key
)
where not exists (
  select 1 from public.exercises existing where existing.title = seed.title
);

