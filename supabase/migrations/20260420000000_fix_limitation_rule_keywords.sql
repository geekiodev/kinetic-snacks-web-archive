-- Fix overly broad limitation rule keywords.
--
-- The previous seed used bare body-part words ('hip', 'knee', 'shoulder', 'ankle')
-- as keywords. These match any exercise that mentions the word in passing — e.g.
-- "keep hips neutral" in an instruction, or 'hips_glutes' as a body region tag —
-- blocking exercises that are completely safe for that limitation.
--
-- Rules: keywords should match specific HIGH-RISK movement patterns only.
-- A seated overhead press is safe for hip pain; a kettlebell swing is not.

update public.limitation_rules
set keywords = array[
  'jump', 'lunge', 'squat', 'burpee', 'plyometric',
  'running', 'sprint', 'high impact', 'jump rope', 'box jump'
]
where limitation_key = 'Knee Issues';

update public.limitation_rules
set keywords = array[
  'deadlift', 'toe touch', 'forward fold', 'good morning',
  'spinal rotation', 'heavy row', 'bent over', 'jefferson curl'
]
where limitation_key = 'Back Pain';

update public.limitation_rules
set keywords = array[
  'overhead press', 'push-up', 'push up', 'pull-up', 'pull up',
  'upright row', 'handstand', 'chest fly', 'dip', 'overhead carry'
]
where limitation_key = 'Shoulder Injury';

update public.limitation_rules
set keywords = array[
  'plank', 'push-up', 'push up', 'burpee', 'handstand',
  'wrist curl', 'wrist extension', 'bear crawl'
]
where limitation_key = 'Wrist Problems';

update public.limitation_rules
set keywords = array[
  'jump', 'hop', 'skip', 'plyometric', 'box jump',
  'jump rope', 'sprint', 'calf raise', 'single leg'
]
where limitation_key = 'Ankle Issues';

update public.limitation_rules
set keywords = array[
  'hip hinge', 'kettlebell swing', 'deadlift', 'lunge',
  'squat', 'step up', 'hip thrust', 'glute bridge',
  'clean', 'snatch', 'bulgarian split'
]
where limitation_key = 'Hip Pain';
