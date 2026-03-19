import { describe, expect, it } from 'vitest';
import { rankExercises } from '../exerciseGenerator';
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
