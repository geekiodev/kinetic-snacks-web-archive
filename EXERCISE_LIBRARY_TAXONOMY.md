# Exercise Library Taxonomy & Coverage Matrix

## Purpose

This document defines the canonical taxonomy and initial coverage matrix for the `public.exercises` seed library.

It is intended to guide:

- seed generation,
- future exercise authoring,
- ranking and personalization logic,
- premium generation constraints,
- QA review of exercise coverage.

The near-term product goal is not unlimited novelty. The goal is to ensure every user can reliably see at least three high-confidence, preference-matching exercise snacks in the dashboard.

## Product constraints from the current app

The current product already personalizes exercises using:

- limitations,
- available equipment,
- location,
- intensity,
- target duration.

The current dashboard pipeline loads active exercises, validates compatibility, ranks the survivors, and only falls back to generation when the matching pool is too small. The seed library therefore needs enough breadth to cover those filters before AI generation is introduced as a premium enhancement.

## Canonical taxonomy

### 1. Primary categories

Every exercise must have exactly one primary category.

- `Mobility`
  - Range-of-motion work, joint prep, posture resets, decompression.
- `Activation`
  - Nervous-system wake-up work, glute/core/scapular activation, circulation.
- `Strength`
  - Light muscular loading, controlled bodyweight or equipment-assisted strength.
- `Recovery`
  - Low-demand restoration, breathing resets, unwind sequences.

### 2. Secondary tags

These tags should be captured in future schema updates or tracked during content generation even if they are not yet stored in the DB.

#### Movement pattern tags

- `upper_push`
- `upper_pull`
- `core`
- `hip_hinge`
- `squat_pattern`
- `lateral_shift`
- `rotation`
- `balance`
- `gait_or_march`
- `spinal_mobility`
- `shoulder_mobility`
- `hip_mobility`
- `ankle_mobility`

#### Body region emphasis tags

- `neck_upper_back`
- `shoulders`
- `wrists_forearms`
- `thoracic_spine`
- `low_back`
- `hips_glutes`
- `knees`
- `ankles_calves`
- `core`
- `full_body`

#### Context tags

- `office_friendly`
- `no_floor_transition`
- `low_sweat`
- `small_space`
- `standing_only`
- `camera_safe`
- `home_friendly`
- `outdoor_friendly`

### 3. Intensity bands

The current app supports:

- `low`
- `medium`

Seed content should be distributed heavily toward `low`, because the landing page and onboarding emphasize frictionless, no-sweat, schedule-friendly movement snacks.

### 4. Duration bands

The app supports 3–15 minutes. The initial library should concentrate on the most usable bands:

- `3 min`
- `5 min`
- `7 min`
- `10 min`
- `12 min`
- `15 min`

Recommended weighting:

- 3 min: highest volume
- 5 min: highest volume
- 7 min: medium-high volume
- 10 min: medium volume
- 12 min: lower volume
- 15 min: lower volume

### 5. Equipment groups

The exercise library should explicitly cover the equipment choices exposed in onboarding:

- `None / Bodyweight Only`
- `Chair`
- `Wall Space`
- `Floor Space`
- `Yoga Mat`
- `Resistance Bands`
- `Dumbbells`
- `Kettlebells`
- `Jump Rope`
- `Countertop`
- `Doorway Pull-up Bar`

## Content design rules

Every seeded exercise should follow these authoring rules:

1. Be understandable at a glance.
2. Be executable in the promised duration.
3. Avoid ambiguous or highly technical coaching cues.
4. Prefer low-friction setup.
5. Include one useful tip that explains why the snack fits real life.
6. Avoid near-duplicate titles unless they represent a meaningful variation.
7. Prefer predictable, trustworthy programming over novelty for novelty's sake.

## Coverage matrix

The v1 library target is **120 exercises**.

This is enough to support broad compatibility without overproducing low-quality content.

### A. Category distribution

| Category | Target Count | Why |
| --- | ---: | --- |
| Mobility | 36 | Best fit for desk workers, low-sweat use cases, and broad compatibility |
| Activation | 30 | Strong fit for short snacks and workday energy boosts |
| Strength | 36 | Required for progression and premium perceived value |
| Recovery | 18 | Important for habit retention and end-of-day use cases |

### B. Intensity distribution

| Intensity | Target Count | Why |
| --- | ---: | --- |
| Low | 84 | Matches brand promise of no-sweat, work-friendly movement |
| Medium | 36 | Supports progression and premium value without skewing too intense |

### C. Duration distribution

| Duration | Target Count |
| --- | ---: |
| 3 min | 24 |
| 5 min | 32 |
| 7 min | 24 |
| 10 min | 18 |
| 12 min | 12 |
| 15 min | 10 |

### D. Equipment distribution

Exercises may belong to more than one equipment-compatible cluster, but the authored library should at minimum include approximately this many primary equipment-led snacks.

| Equipment Group | Target Count |
| --- | ---: |
| None / Bodyweight Only | 34 |
| Chair | 16 |
| Wall Space | 14 |
| Floor Space | 10 |
| Yoga Mat | 10 |
| Resistance Bands | 12 |
| Dumbbells | 12 |
| Kettlebells | 8 |
| Jump Rope | 8 |
| Countertop | 6 |
| Doorway Pull-up Bar | 6 |

### E. Location/context emphasis

The current app does not yet store location tags on exercises, but the authored library should intentionally include content suitable for these contexts:

| Context | Coverage Goal |
| --- | --- |
| Workplace / Home Office | Highest |
| Living Room / Bedroom | High |
| Outdoor Space | Medium |
| Gym | Medium |

### F. Movement pattern minimums

Each movement pattern should have enough representation across intensity and duration bands to avoid recommendation dead-ends.

| Movement Pattern | Minimum Count |
| --- | ---: |
| Spinal mobility / posture reset | 12 |
| Shoulder mobility / scapular work | 12 |
| Hip mobility / glute activation | 12 |
| Core / trunk stability | 12 |
| Balance / single-leg control | 8 |
| Upper push | 8 |
| Upper pull / pull-prep | 6 |
| Squat pattern | 8 |
| Hinge pattern | 6 |
| March / circulation / gait | 8 |
| Recovery / breathing / decompression | 10 |

## Coverage by onboarding constraints

The initial library must be able to serve users who choose common combinations from onboarding.

### Limitations-aware content goals

Even before richer structured contraindication metadata exists, v1 content should deliberately include safe-leaning options for these common selections:

- Knee Issues
- Back Pain
- Shoulder Injury
- Wrist Problems
- Ankle Issues
- Hip Pain
- None

For each of the first six limitation groups, the library should contain at least:

- 6 low-intensity options,
- 2 medium-intensity options,
- 2 options at 3–5 minutes,
- 2 options at 7–10 minutes,
- 1 office-friendly standing-only option.

### Equipment fallback goals

For users with strict constraints, the library should always preserve a safe fallback path:

- At least 20 exercises that require no floor transition.
- At least 20 exercises that are office-friendly and low-sweat.
- At least 15 exercises that are standing-only.
- At least 15 exercises that work with no equipment whatsoever.

## Recommendation design goals

The dashboard should eventually be able to form a three-card set with intentional variety.

For most users, the top three daily suggestions should ideally include:

1. one mobility or recovery option,
2. one activation option,
3. one strength-leaning or energizing option.

If strict preferences prevent that mix, the system should prioritize compatibility first and variety second.

## Seed generation order

Exercises should be authored in this order:

### Batch 1: Core universal coverage (40)

- Bodyweight only
- Chair
- Wall Space
- Mostly low intensity
- Mostly 3/5/7 minute durations
- Strong workplace and home-office fit

### Batch 2: Variation and progression (40)

- Add medium-intensity options
- Add floor/yoga mat coverage
- Add more activation and strength pairings
- Expand duration diversity

### Batch 3: Premium breadth and edge-case coverage (40)

- Resistance bands
- Dumbbells
- Countertop
- Doorway pull-up bar
- More progressive patterns
- More specific context variations

## Seed review checklist

Before new exercises are marked active, review for:

- duration realism,
- instruction clarity,
- equipment correctness,
- category fit,
- intensity realism,
- dedupe risk,
- likely conflicts with common limitations,
- whether the tip helps explain real-life usability.

## Non-goals for v1

The initial seed library does **not** need to solve:

- full clinical-grade injury screening,
- highly individualized physical therapy programming,
- dynamic LLM-authored plans in production,
- complex progression trees,
- perfect space-awareness.

Those should come after the curated library is established and the schema is enriched.

## Immediate implementation outcome

This taxonomy and coverage matrix should be treated as the source brief for the first seeded library migration.
