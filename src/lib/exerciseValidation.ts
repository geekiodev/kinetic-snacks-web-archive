import { UserPreferences, Exercise } from '../App';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const normalize = (value: string) => value.trim().toLowerCase();

const prefersNoEquipment = (equipment: string[]) =>
  equipment.some((item) => normalize(item).includes('none'));

const isEquipmentCompatible = (exerciseEquipment: string[], availableEquipment: string[]) => {
  if (exerciseEquipment.length === 0) return true;
  if (prefersNoEquipment(exerciseEquipment)) return true;

  const available = new Set(availableEquipment.map(normalize));
  return exerciseEquipment.every((item) => available.has(normalize(item)));
};

export const validateExerciseCandidate = (
  candidate: Exercise,
  preferences: UserPreferences
): ValidationResult => {
  if (!isEquipmentCompatible(candidate.equipment, preferences.equipment)) {
    return { valid: false, reason: 'Equipment not available' };
  }

  if (preferences.intensityLevel && candidate.intensity !== preferences.intensityLevel) {
    return { valid: false, reason: 'Intensity mismatch' };
  }

  if (Number.isFinite(preferences.duration) && candidate.duration > preferences.duration + 2) {
    return { valid: false, reason: 'Duration too long' };
  }

  return { valid: true };
};
