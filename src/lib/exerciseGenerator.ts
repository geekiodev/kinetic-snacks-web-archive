import { Exercise, UserPreferences } from '../App';

interface GenerateExercisesInput {
  preferences: UserPreferences;
  count: number;
}

interface RankExercisesInput {
  preferences: UserPreferences;
  exercises: Exercise[];
}

const normalize = (value: string) => value.trim().toLowerCase();

const hasOverlap = (left: string[] | undefined, right: string[] | undefined) => {
  const rightSet = new Set((right ?? []).map(normalize));
  return (left ?? []).some((value) => rightSet.has(normalize(value)));
};

const prefersWorkContext = (locations: string[]) =>
  locations.some((location) => ['workplace', 'home office'].includes(normalize(location)));

export const generateExercises = async (
  input: GenerateExercisesInput
): Promise<Exercise[]> => {
  void input;
  return [];
};

export const rankExercises = ({ preferences, exercises }: RankExercisesInput): Exercise[] => {
  const targetDuration = preferences.duration;
  const intensity = preferences.intensityLevel;
  const locationPreferences = preferences.location ?? [];
  const equipment = new Set(preferences.equipment.map((item) => item.toLowerCase()));
  const workContext = prefersWorkContext(locationPreferences);

  const score = (exercise: Exercise) => {
    let total = 0;

    if (intensity && exercise.intensity === intensity) total += 4;

    if (Number.isFinite(targetDuration)) {
      total += Math.max(0, 4 - Math.abs(exercise.duration - targetDuration));
    }

    if (
      exercise.equipment.length === 0 ||
      exercise.equipment.some((item) => equipment.has(item.toLowerCase()))
    ) {
      total += 2;
    }

    if (hasOverlap(exercise.locationTags, locationPreferences)) {
      total += 3;
    }

    if (workContext) {
      if (exercise.noSweat) total += 2;
      if (exercise.standingOnly) total += 2;
      if (!exercise.requiresFloor) total += 1;
      if (hasOverlap(exercise.contextTags, ['office_friendly', 'camera_safe', 'low_sweat'])) {
        total += 2;
      }
    } else {
      if (hasOverlap(exercise.contextTags, ['home_friendly', 'outdoor_friendly'])) {
        total += 1;
      }
    }

    return total;
  };

  const sorted = [...exercises].sort((a, b) => score(b) - score(a));
  const categoryCounts = new Map<string, number>();
  const variationCounts = new Map<string, number>();

  return sorted
    .map((exercise) => {
      const categoryKey = normalize(exercise.category);
      const variationKey = normalize(exercise.variationKey ?? exercise.title);
      const categorySeen = categoryCounts.get(categoryKey) ?? 0;
      const variationSeen = variationCounts.get(variationKey) ?? 0;
      const diversityPenalty = categorySeen * 1.5 + variationSeen * 3;
      const finalScore = score(exercise) - diversityPenalty;

      categoryCounts.set(categoryKey, categorySeen + 1);
      variationCounts.set(variationKey, variationSeen + 1);

      return { exercise, finalScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .map(({ exercise }) => exercise);
};
