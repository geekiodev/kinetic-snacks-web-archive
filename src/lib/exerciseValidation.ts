import { UserPreferences, Exercise } from '../App';
import { supabase } from './supabase';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const normalize = (value: string) => value.trim().toLowerCase();

const prefersNoEquipment = (equipment: string[]) =>
  equipment.some((item) => normalize(item).includes('none'));

export type LimitationRuleMap = Record<string, string[]>;

let cachedRules: LimitationRuleMap | null = null;
let cachedAt: number | null = null;
const RULE_CACHE_MS = 5 * 60 * 1000;
const DURATION_TOLERANCE_MINUTES = 2;

export const loadLimitationRules = async (): Promise<LimitationRuleMap> => {
  if (cachedRules && cachedAt && Date.now() - cachedAt < RULE_CACHE_MS) {
    return cachedRules;
  }

  const { data, error } = await supabase
    .from('limitation_rules')
    .select('limitation_key, keywords, is_active')
    .eq('is_active', true);

  if (error || !data) {
    cachedRules = {};
    cachedAt = Date.now();
    return cachedRules;
  }

  const mapped: LimitationRuleMap = {};
  for (const row of data) {
    if (!row?.limitation_key) continue;
    const key = normalize(row.limitation_key);
    const keywords = Array.isArray(row.keywords) ? row.keywords.map(normalize) : [];
    mapped[key] = keywords;
  }

  cachedRules = mapped;
  cachedAt = Date.now();
  return mapped;
};

const isEquipmentCompatible = (exerciseEquipment: string[], availableEquipment: string[]) => {
  const available = new Set(availableEquipment.map(normalize));

  if (prefersNoEquipment(availableEquipment)) {
    return exerciseEquipment.length === 0 || prefersNoEquipment(exerciseEquipment);
  }

  if (exerciseEquipment.length === 0) return true;
  if (prefersNoEquipment(exerciseEquipment)) return true;

  return exerciseEquipment.every((item) => available.has(normalize(item)));
};

export const isSafeForLimitations = (
  candidate: Exercise,
  limitations: string[],
  limitationRules: LimitationRuleMap,
): boolean => {
  const activeLimitations = limitations.filter((l) => normalize(l) !== 'none');
  if (activeLimitations.length === 0) return true;
  if (violatesContraindications(candidate, activeLimitations)) return false;
  if (violatesKeywordRules(candidate, activeLimitations, limitationRules)) return false;
  return true;
};

const violatesContraindications = (candidate: Exercise, limitations: string[]) => {
  const contraindications = new Set((candidate.contraindicationTags ?? []).map(normalize));
  if (contraindications.size === 0) return false;

  return limitations
    .map(normalize)
    .filter((limitation) => limitation !== 'none')
    .some((limitation) => contraindications.has(limitation));
};

const violatesKeywordRules = (
  candidate: Exercise,
  limitations: string[],
  limitationRules: LimitationRuleMap
) => {
  const keywords = limitations
    .map(normalize)
    .flatMap((limit) => limitationRules[limit] ?? []);

  if (keywords.length === 0) return false;

  const haystack = [
    candidate.title,
    candidate.tips,
    candidate.category,
    ...(candidate.movementTags ?? []),
    ...(candidate.bodyRegionTags ?? []),
    ...candidate.instructions,
  ]
    .filter(Boolean)
    .map(normalize)
    .join(' ');

  return keywords.some((keyword) => haystack.includes(keyword));
};

export const validateExerciseCandidate = (
  candidate: Exercise,
  preferences: UserPreferences,
  limitationRules: LimitationRuleMap
): ValidationResult => {
  if (!isEquipmentCompatible(candidate.equipment, preferences.equipment)) {
    return { valid: false, reason: 'Equipment not available' };
  }

  if (preferences.limitations.length > 0 && !preferences.limitations.includes('None')) {
    if (violatesContraindications(candidate, preferences.limitations)) {
      return { valid: false, reason: 'Conflicts with limitations' };
    }

    if (violatesKeywordRules(candidate, preferences.limitations, limitationRules)) {
      return { valid: false, reason: 'Conflicts with limitations' };
    }
  }

  if (preferences.intensityLevel && candidate.intensity !== preferences.intensityLevel) {
    return { valid: false, reason: 'Intensity mismatch' };
  }

  if (Number.isFinite(preferences.duration) && candidate.duration > preferences.duration + DURATION_TOLERANCE_MINUTES) {
    return { valid: false, reason: 'Duration too long' };
  }

  return { valid: true };
};
