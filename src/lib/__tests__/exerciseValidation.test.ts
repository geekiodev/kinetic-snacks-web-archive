import { describe, expect, it } from 'vitest';
import { validateExerciseCandidate, LimitationRuleMap } from '../exerciseValidation';
import type { Exercise, UserPreferences } from '../../App';

const baseExercise: Exercise = {
  id: 'ex-1',
  title: 'Chair Squats',
  duration: 5,
  intensity: 'low',
  equipment: [],
  instructions: ['Stand up', 'Sit down'],
  tips: 'Keep back straight.',
  category: 'strength',
};

const basePreferences: UserPreferences = {
  limitations: [],
  equipment: ['None'],
  location: ['Home'],
  intensityLevel: 'low',
  duration: 5,
};

const rules: LimitationRuleMap = {
  'knee issues': ['squat', 'lunge'],
};

describe('validateExerciseCandidate', () => {
  it('rejects when equipment is not available', () => {
    const candidate = { ...baseExercise, equipment: ['Dumbbell'] };
    const result = validateExerciseCandidate(candidate, basePreferences, rules);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Equipment not available');
  });

  it('rejects when limitations are violated', () => {
    const candidate = { ...baseExercise, title: 'Deep Squats' };
    const prefs = { ...basePreferences, limitations: ['Knee Issues'] };
    const result = validateExerciseCandidate(candidate, prefs, rules);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Conflicts with limitations');
  });

  it('rejects when intensity mismatches', () => {
    const candidate = { ...baseExercise, intensity: 'medium' };
    const result = validateExerciseCandidate(candidate, basePreferences, rules);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Intensity mismatch');
  });

  it('rejects when duration is too long', () => {
    const candidate = { ...baseExercise, duration: 10 };
    const result = validateExerciseCandidate(candidate, basePreferences, rules);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Duration too long');
  });

  it('accepts when all constraints pass', () => {
    const result = validateExerciseCandidate(baseExercise, basePreferences, rules);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});
