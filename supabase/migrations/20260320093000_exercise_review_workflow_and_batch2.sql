-- Add exercise review workflow metadata
alter table public.exercises
  add column if not exists source_type text not null default 'curated_seed' check (source_type in ('curated_seed', 'generated_template', 'reviewed_generated')),
  add column if not exists review_status text not null default 'approved' check (review_status in ('approved', 'pending', 'rejected')),
  add column if not exists reviewed_at timestamp with time zone,
  add column if not exists reviewed_by text,
  add column if not exists review_notes text;

update public.exercises
set reviewed_at = coalesce(reviewed_at, now())
where review_status = 'approved';

insert into public.exercises (
  title, duration_minutes, intensity, equipment, instructions, tips, category,
  movement_tags, body_region_tags, context_tags, location_tags, contraindication_tags,
  requires_floor, standing_only, no_sweat, variation_key
)
select *
from (
values
  (
    'Couch-to-Desk Mobility Recharge',
    7,
    'low',
    array['None / Bodyweight Only'],
    array['Stand tall and reach both arms overhead', 'Perform 8 slow side bends per side', 'Add 10 thoracic rotations', 'Finish with 3 long exhales'],
    'Built for the end of a long sitting block when you need to loosen up fast.',
    'Mobility',
    array['spinal_mobility', 'rotation'],
    array['thoracic_spine', 'low_back'],
    array['office_friendly', 'low_sweat'],
    array['Workplace', 'Home Office', 'Living Room'],
    array[]::text[],
    false,
    true,
    true,
    'couch-desk-recharge'
  ),
  (
    'Band Core Press Ladder',
    7,
    'medium',
    array['Resistance Bands'],
    array['Anchor the band at chest height', 'Press straight out for 8 reps per side', 'Hold the last rep for 10 seconds', 'Repeat 3 rounds'],
    'A compact anti-rotation set when you want more challenge than a reset snack.',
    'Strength',
    array['core', 'rotation'],
    array['core'],
    array['home_friendly', 'small_space'],
    array['Home Office', 'Living Room', 'Gym'],
    array['Shoulder Injury'],
    false,
    true,
    false,
    'band-core-press'
  ),
  (
    'Doorway Pull Prep Hold',
    5,
    'medium',
    array['Doorway Pull-up Bar'],
    array['Grip the bar with feet supported on the floor', 'Hold a tall hollow position for 15 seconds', 'Perform 5 scap pulls', 'Repeat 3 rounds'],
    'A premium-feeling pull session without needing full pull-ups.',
    'Strength',
    array['upper_pull'],
    array['shoulders', 'core'],
    array['home_friendly', 'small_space'],
    array['Bedroom', 'Home Office'],
    array['Shoulder Injury', 'Wrist Problems'],
    false,
    true,
    false,
    'doorway-pull-prep'
  ),
  (
    'Floor Rotation Reset',
    10,
    'low',
    array['Floor Space', 'Yoga Mat'],
    array['Lie on your back with knees bent', 'Drop the knees side to side slowly', 'Add 5 long breaths each direction', 'Finish with a gentle knee hug'],
    'A low-stimulation recovery snack for the end of the day.',
    'Recovery',
    array['rotation', 'spinal_mobility'],
    array['low_back', 'core'],
    array['home_friendly'],
    array['Bedroom', 'Living Room'],
    array['Hip Pain'],
    true,
    false,
    true,
    'floor-rotation-reset'
  ),
  (
    'Standing Shoulder Buffer',
    5,
    'low',
    array['Wall Space'],
    array['Stand beside a wall', 'Perform 10 wall-assisted arm circles', 'Do 8 wall slides', 'Finish with a chest opener'],
    'Useful between meetings when your shoulders feel loaded from typing.',
    'Recovery',
    array['shoulder_mobility'],
    array['shoulders', 'neck_upper_back'],
    array['office_friendly', 'camera_safe', 'low_sweat'],
    array['Workplace', 'Home Office'],
    array['Shoulder Injury'],
    false,
    true,
    true,
    'standing-shoulder-buffer'
  ),
  (
    'Dumbbell Tempo Squat Snack',
    10,
    'medium',
    array['Dumbbells'],
    array['Hold one dumbbell at chest height', 'Lower into a controlled squat for 3 counts', 'Stand tall', 'Complete 8 reps for 3 rounds'],
    'For days when you want a more strength-forward snack in a short window.',
    'Strength',
    array['squat_pattern'],
    array['hips_glutes', 'knees'],
    array['home_friendly'],
    array['Living Room', 'Gym'],
    array['Knee Issues', 'Hip Pain'],
    false,
    true,
    false,
    'dumbbell-tempo-squat'
  ),
  (
    'Countertop Recovery Fold',
    5,
    'low',
    array['Countertop'],
    array['Place both hands on the countertop', 'Step back and lengthen the spine', 'Bend the knees softly', 'Hold for 3 slow breaths and repeat'],
    'A no-floor decompression option for home-office days.',
    'Recovery',
    array['hip_hinge', 'spinal_mobility'],
    array['low_back', 'thoracic_spine'],
    array['home_friendly', 'low_sweat'],
    array['Home Office', 'Living Room'],
    array['Back Pain'],
    false,
    true,
    true,
    'countertop-recovery-fold'
  ),
  (
    'Chair Balance and Reach Flow',
    7,
    'low',
    array['Chair'],
    array['Stand behind the chair', 'Lift one knee and hold for 15 seconds', 'Reach the opposite arm overhead', 'Switch sides and repeat 3 rounds'],
    'A gentle coordination snack when you want balance work without much intensity.',
    'Activation',
    array['balance'],
    array['ankles_calves', 'core'],
    array['office_friendly', 'low_sweat'],
    array['Workplace', 'Home Office', 'Living Room'],
    array['Ankle Issues'],
    false,
    true,
    true,
    'chair-balance-reach'
  )

) as seed (
  title, duration_minutes, intensity, equipment, instructions, tips, category,
  movement_tags, body_region_tags, context_tags, location_tags, contraindication_tags,
  requires_floor, standing_only, no_sweat, variation_key
)
where not exists (
  select 1 from public.exercises existing where existing.title = seed.title
);
