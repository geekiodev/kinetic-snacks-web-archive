import { Exercise, UserPreferences } from '../App';

interface GenerateExercisesInput {
  preferences: UserPreferences;
  count: number;
}

export const generateExercises = async (
  _input: GenerateExercisesInput
): Promise<Exercise[]> => {
  return [];
};
