import { describe, expect, it } from 'vitest';
import { generateExercises, rankExercises } from '../exerciseGenerator';
import type { Exercise, UserPreferences } from '../../App';

const preferences: UserPreferences = {
  limitations: [],
  equipment: ['Chair', 'Resistance Bands'],
  location: ['Workplace', 'Home Office'],
  intensityLevel: 'low',
  duration: 5,
};

const baseExercise = (overrides: Partial<Exercise>): Exercise => ({
  id: overrides.id ?? 'exercise-id',
  title: overrides.title ?? 'Exercise',
  duration: overrides.duration ?? 5,
  intensity: overrides.intensity ?? 'low',
  equipment: overrides.equipment ?? [],
  instructions: overrides.instructions ?? ['Step 1'],
  tips: overrides.tips ?? 'Tip',
  category: overrides.category ?? 'Mobility',
  movementTags: overrides.movementTags ?? [],
  bodyRegionTags: overrides.bodyRegionTags ?? [],
  contextTags: overrides.contextTags ?? [],
  locationTags: overrides.locationTags ?? [],
  contraindicationTags: overrides.contraindicationTags ?? [],
  requiresFloor: overrides.requiresFloor ?? false,
  standingOnly: overrides.standingOnly ?? false,
  noSweat: overrides.noSweat ?? true,
  variationKey: overrides.variationKey,
});

describe('rankExercises', () => {
  it('prioritizes workplace-friendly exercises for workplace preferences', () => {
    const ranked = rankExercises({
      preferences,
      exercises: [
        baseExercise({
          id: 'floor-core',
          title: 'Floor Core Flow',
          equipment: ['Yoga Mat'],
          locationTags: ['Living Room'],
          requiresFloor: true,
          noSweat: false,
          category: 'Strength',
        }),
        baseExercise({
          id: 'desk-reset',
          title: 'Desk Reset',
          equipment: ['Chair'],
          locationTags: ['Workplace', 'Home Office'],
          contextTags: ['office_friendly', 'camera_safe', 'low_sweat'],
          standingOnly: true,
          category: 'Mobility',
        }),
      ],
    });

    expect(ranked[0].id).toBe('desk-reset');
  });




  it('adapts ranking using completion history by boosting familiar categories and avoiding exact repeats', () => {
    const ranked = rankExercises({
      preferences,
      exercises: [
        baseExercise({
          id: 'recent-mobility',
          title: 'Recent Mobility',
          category: 'Mobility',
          variationKey: 'recent-mobility',
          contextTags: ['office_friendly'],
          locationTags: ['Workplace'],
          standingOnly: true,
        }),
        baseExercise({
          id: 'new-mobility',
          title: 'New Mobility',
          category: 'Mobility',
          variationKey: 'new-mobility',
          contextTags: ['office_friendly'],
          locationTags: ['Workplace'],
          standingOnly: true,
        }),
        baseExercise({
          id: 'new-strength',
          title: 'New Strength',
          category: 'Strength',
          variationKey: 'new-strength',
          contextTags: ['office_friendly'],
          locationTags: ['Workplace'],
          standingOnly: true,
        }),
      ],
      history: {
        recentExerciseIds: ['recent-mobility'],
        recentVariationKeys: ['recent-mobility'],
        categoryCounts: { Mobility: 3 },
      },
    });

    expect(ranked[0].id).toBe('new-mobility');
    expect(ranked[2].id).toBe('recent-mobility');
  });

  it('generates fallback exercises with fit reasons when the database pool is too small', async () => {
    const generated = await generateExercises({
      preferences,
      count: 2,
    });

    expect(generated).toHaveLength(2);
    expect(generated[0].fitReasons?.length).toBeGreaterThan(0);
    expect(generated.every((exercise) => exercise.id.includes('generated-'))).toBe(true);
  });

  it('can generate templates for newly supported equipment options', async () => {
    const generated = await generateExercises({
      preferences: {
        ...preferences,
        equipment: ['Kettlebells', 'Jump Rope'],
        location: ['Gym'],
        intensityLevel: 'medium',
        duration: 8,
      },
      count: 3,
    });

    expect(
      generated.some((exercise) => exercise.equipment.includes('Kettlebells'))
      || generated.some((exercise) => exercise.equipment.includes('Jump Rope'))
    ).toBe(true);
  });

  it('spreads categories and variation groups when scores are otherwise similar', () => {
    const ranked = rankExercises({
      preferences,
      exercises: [
        baseExercise({
          id: 'mobility-a',
          title: 'Mobility A',
          category: 'Mobility',
          variationKey: 'desk-reset',
          contextTags: ['office_friendly'],
          locationTags: ['Workplace'],
          standingOnly: true,
        }),
        baseExercise({
          id: 'mobility-b',
          title: 'Mobility B',
          category: 'Mobility',
          variationKey: 'desk-reset',
          contextTags: ['office_friendly'],
          locationTags: ['Workplace'],
          standingOnly: true,
        }),
        baseExercise({
          id: 'activation-a',
          title: 'Activation A',
          category: 'Activation',
          variationKey: 'standing-march',
          contextTags: ['office_friendly'],
          locationTags: ['Workplace'],
          standingOnly: true,
        }),
      ],
    });

    expect(ranked[0].id).toBe('mobility-a');
    expect(ranked[1].id).toBe('activation-a');
    expect(ranked[2].id).toBe('mobility-b');
  });
});
