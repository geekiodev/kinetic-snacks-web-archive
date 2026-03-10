import { Exercise, UserPreferences } from '../App';

interface GenerateExercisesInput {
  preferences: UserPreferences;
  count: number;
}

interface RankExercisesInput {
  preferences: UserPreferences;
  exercises: Exercise[];
}

export const generateExercises = async (
  _input: GenerateExercisesInput
): Promise<Exercise[]> => {
  return [];
};

export const rankExercises = ({ preferences, exercises }: RankExercisesInput): Exercise[] => {
  const targetDuration = preferences.duration;
  const intensity = preferences.intensityLevel;
  const equipment = new Set(preferences.equipment.map((item) => item.toLowerCase()));

  const score = (exercise: Exercise) => {
    let total = 0;
    if (intensity && exercise.intensity === intensity) total += 3;
    if (Number.isFinite(targetDuration)) {
      total += Math.max(0, 3 - Math.abs(exercise.duration - targetDuration));
    }
    if (exercise.equipment.length === 0 || exercise.equipment.some((item) => equipment.has(item.toLowerCase()))) {
      total += 2;
    }
    return total;
  };

  return [...exercises].sort((a, b) => score(b) - score(a));
};
