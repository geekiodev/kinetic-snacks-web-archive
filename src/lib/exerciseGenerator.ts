import { Exercise, UserPreferences } from '../App';

interface GenerateExercisesInput {
  preferences: UserPreferences;
  count: number;
  history?: RankingHistory;
}

export interface RankingHistory {
  recentExerciseIds?: string[];
  recentVariationKeys?: string[];
  categoryCounts?: Record<string, number>;
}

interface RankExercisesInput {
  preferences: UserPreferences;
  exercises: Exercise[];
  history?: RankingHistory;
}

const normalize = (value: string) => value.trim().toLowerCase();

const hasOverlap = (left: string[] | undefined, right: string[] | undefined) => {
  const rightSet = new Set((right ?? []).map(normalize));
  return (left ?? []).some((value) => rightSet.has(normalize(value)));
};

const prefersWorkContext = (locations: string[]) =>
  locations.some((location) => ['workplace', 'home office'].includes(normalize(location)));

const bodyweightOnly = 'None / Bodyweight Only';

const generatedTemplates: Exercise[] = [
  {
    id: 'generated-office-reset',
    title: 'Generated Office Reset Flow',
    duration: 5,
    intensity: 'low',
    equipment: [bodyweightOnly],
    instructions: ['Stand tall beside your desk', 'Reach overhead for 20 seconds', 'Perform 10 gentle torso rotations', 'Finish with 5 deep breaths'],
    tips: 'A no-sweat desk reset when you need to move quickly and get back to work.',
    category: 'Mobility',
    movementTags: ['spinal_mobility', 'shoulder_mobility'],
    bodyRegionTags: ['neck_upper_back', 'thoracic_spine'],
    contextTags: ['office_friendly', 'camera_safe', 'low_sweat'],
    locationTags: ['Workplace', 'Home Office'],
    standingOnly: true,
    requiresFloor: false,
    noSweat: true,
    variationKey: 'generated-office-reset',
    sourceType: 'generated_template',
    reviewStatus: 'approved',
  },
  {
    id: 'generated-chair-core',
    title: 'Generated Chair Core Wake-Up',
    duration: 5,
    intensity: 'low',
    equipment: ['Chair'],
    instructions: ['Sit tall near the edge of a chair', 'March one knee at a time for 30 seconds', 'Brace the core and reach both arms forward', 'Repeat 3 rounds'],
    tips: 'Great for a posture and core boost without leaving your chair behind.',
    category: 'Activation',
    movementTags: ['core', 'gait_or_march'],
    bodyRegionTags: ['core', 'hips_glutes'],
    contextTags: ['office_friendly', 'camera_safe', 'low_sweat'],
    locationTags: ['Workplace', 'Home Office', 'Living Room'],
    standingOnly: false,
    requiresFloor: false,
    noSweat: true,
    variationKey: 'generated-chair-core',
    sourceType: 'generated_template',
    reviewStatus: 'approved',
  },
  {
    id: 'generated-wall-posture',
    title: 'Generated Wall Posture Builder',
    duration: 7,
    intensity: 'low',
    equipment: ['Wall Space'],
    instructions: ['Stand with your back near a wall', 'Perform 10 wall slides', 'Hold a chest opener for 20 seconds', 'Repeat 2 rounds'],
    tips: 'Uses a wall to open the chest and reinforce taller posture.',
    category: 'Mobility',
    movementTags: ['shoulder_mobility'],
    bodyRegionTags: ['shoulders', 'thoracic_spine'],
    contextTags: ['office_friendly', 'small_space', 'low_sweat'],
    locationTags: ['Workplace', 'Home Office', 'Living Room'],
    standingOnly: true,
    requiresFloor: false,
    noSweat: true,
    variationKey: 'generated-wall-posture',
    sourceType: 'generated_template',
    reviewStatus: 'approved',
  },
  {
    id: 'generated-band-activation',
    title: 'Generated Band Activation Ladder',
    duration: 7,
    intensity: 'medium',
    equipment: ['Resistance Bands'],
    instructions: ['Hold the band at chest height', 'Perform 12 pull-aparts', 'Add 10 rows', 'Repeat 3 rounds'],
    tips: 'A compact upper-body activation set when you have a band handy.',
    category: 'Activation',
    movementTags: ['upper_pull'],
    bodyRegionTags: ['shoulders', 'thoracic_spine'],
    contextTags: ['home_friendly'],
    locationTags: ['Home Office', 'Living Room', 'Gym'],
    standingOnly: true,
    requiresFloor: false,
    noSweat: false,
    variationKey: 'generated-band-activation',
    sourceType: 'generated_template',
    reviewStatus: 'approved',
  },
  {
    id: 'generated-mat-recovery',
    title: 'Generated Mat Recovery Flow',
    duration: 10,
    intensity: 'low',
    equipment: ['Yoga Mat', 'Floor Space'],
    instructions: ['Lie on your back with knees bent', 'Pull one knee in for 20 seconds', 'Switch sides', 'Finish with 5 slow breaths'],
    tips: 'A gentle recovery snack for home days when the floor is available.',
    category: 'Recovery',
    movementTags: ['core', 'hip_mobility'],
    bodyRegionTags: ['low_back', 'hips_glutes'],
    contextTags: ['home_friendly'],
    locationTags: ['Bedroom', 'Living Room'],
    standingOnly: false,
    requiresFloor: true,
    noSweat: true,
    variationKey: 'generated-mat-recovery',
    sourceType: 'generated_template',
    reviewStatus: 'approved',
  },
  {
    id: 'generated-dumbbell-strength',
    title: 'Generated Dumbbell Strength Snack',
    duration: 10,
    intensity: 'medium',
    equipment: ['Dumbbells'],
    instructions: ['Hold two dumbbells by your sides', 'Perform 10 controlled hinges', 'Rest for 20 seconds', 'Repeat 3 rounds'],
    tips: 'Short strength work when you want more than a posture reset.',
    category: 'Strength',
    movementTags: ['hip_hinge'],
    bodyRegionTags: ['hips_glutes', 'core'],
    contextTags: ['home_friendly'],
    locationTags: ['Living Room', 'Gym'],
    standingOnly: true,
    requiresFloor: false,
    noSweat: false,
    variationKey: 'generated-dumbbell-strength',
    sourceType: 'generated_template',
    reviewStatus: 'approved',
  },
  {
    id: 'generated-standing-balance',
    title: 'Generated Standing Balance Boost',
    duration: 5,
    intensity: 'low',
    equipment: [bodyweightOnly],
    instructions: ['Stand tall with feet hip-width apart', 'Lift one knee and balance for 20 seconds', 'Switch sides', 'Repeat 3 rounds'],
    tips: 'Quick balance work that fits a small space and zero setup.',
    category: 'Activation',
    movementTags: ['balance'],
    bodyRegionTags: ['ankles_calves', 'core'],
    contextTags: ['office_friendly', 'low_sweat', 'small_space'],
    locationTags: ['Workplace', 'Home Office', 'Living Room'],
    standingOnly: true,
    requiresFloor: false,
    noSweat: true,
    variationKey: 'generated-standing-balance',
    sourceType: 'generated_template',
    reviewStatus: 'approved',
  },
  {
    id: 'generated-countertop-push',
    title: 'Generated Countertop Push Circuit',
    duration: 7,
    intensity: 'medium',
    equipment: ['Countertop'],
    instructions: ['Place hands on a stable countertop', 'Perform 8 incline push-ups', 'Hold an incline plank for 20 seconds', 'Repeat 3 rounds'],
    tips: 'A compact upper-body snack when floor push-ups are not practical.',
    category: 'Strength',
    movementTags: ['upper_push', 'core'],
    bodyRegionTags: ['shoulders', 'core'],
    contextTags: ['home_friendly', 'small_space'],
    locationTags: ['Home Office', 'Living Room'],
    standingOnly: true,
    requiresFloor: false,
    noSweat: false,
    variationKey: 'generated-countertop-push',
    sourceType: 'generated_template',
    reviewStatus: 'approved',
  },
];

export const describeExerciseFit = (exercise: Exercise, preferences: UserPreferences): string[] => {
  const reasons: string[] = [];
  const preferredLocations = preferences.location ?? [];
  const durationDelta = Math.abs(exercise.duration - preferences.duration);

  if (durationDelta <= 1) {
    reasons.push(`Matches your ${preferences.duration}-minute target`);
  }

  if (hasOverlap(exercise.locationTags, preferredLocations)) {
    reasons.push(`Fits your ${preferredLocations[0]} setup`);
  }

  if (prefersWorkContext(preferredLocations) && exercise.noSweat) {
    reasons.push('Low-sweat and work-friendly');
  }

  if (exercise.standingOnly) {
    reasons.push('No floor work required');
  } else if (!exercise.requiresFloor && !reasons.includes('No floor work required')) {
    reasons.push('Easy setup');
  }

  if (exercise.equipment.length > 0 && !exercise.equipment.some((item) => normalize(item).includes('none'))) {
    reasons.push(`Uses ${exercise.equipment[0]}`);
  }

  return reasons.slice(0, 3);
};

export const generateExercises = async ({ preferences, count, history }: GenerateExercisesInput): Promise<Exercise[]> => {
  if (count <= 0) {
    return [];
  }

  const rankedTemplates = rankExercises({ preferences, exercises: generatedTemplates, history });
  return rankedTemplates.slice(0, count).map((exercise, index) => ({
    ...exercise,
    id: `${exercise.id}-${normalize(preferences.location.join('-') || 'general')}-${preferences.duration}-${index}`,
    fitReasons: describeExerciseFit(exercise, preferences),
  }));
};

export const rankExercises = ({ preferences, exercises, history }: RankExercisesInput): Exercise[] => {
  const targetDuration = preferences.duration;
  const intensity = preferences.intensityLevel;
  const locationPreferences = preferences.location ?? [];
  const equipment = new Set(preferences.equipment.map((item) => item.toLowerCase()));
  const workContext = prefersWorkContext(locationPreferences);
  const recentExerciseIds = new Set((history?.recentExerciseIds ?? []).map(normalize));
  const recentVariationKeys = new Set((history?.recentVariationKeys ?? []).map(normalize));
  const categoryCounts = new Map(
    Object.entries(history?.categoryCounts ?? {}).map(([category, count]) => [normalize(category), count])
  );

  const score = (exercise: Exercise) => {
    let total = 0;

    if (intensity && exercise.intensity === intensity) total += 4;

    if (Number.isFinite(targetDuration)) {
      total += Math.max(0, 4 - Math.abs(exercise.duration - targetDuration));
    }

    if (
      exercise.equipment.length === 0 ||
      exercise.equipment.some((item) =>
        normalize(item).includes('none') || equipment.has(item.toLowerCase())
      )
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
    } else if (hasOverlap(exercise.contextTags, ['home_friendly', 'outdoor_friendly'])) {
      total += 1;
    }

    const categoryKey = normalize(exercise.category);
    const variationKey = normalize(exercise.variationKey ?? exercise.title);
    total += Math.min(3, (categoryCounts.get(categoryKey) ?? 0) * 0.75);

    if (recentExerciseIds.has(normalize(exercise.id))) {
      total -= 5;
    }

    if (recentVariationKeys.has(variationKey)) {
      total -= 2;
    }

    return total;
  };

  const sorted = [...exercises].sort((a, b) => score(b) - score(a));
  const rankedCategoryCounts = new Map<string, number>();
  const rankedVariationCounts = new Map<string, number>();

  return sorted
    .map((exercise) => {
      const categoryKey = normalize(exercise.category);
      const variationKey = normalize(exercise.variationKey ?? exercise.title);
      const categorySeen = rankedCategoryCounts.get(categoryKey) ?? 0;
      const variationSeen = rankedVariationCounts.get(variationKey) ?? 0;
      const diversityPenalty = categorySeen * 1.5 + variationSeen * 3;
      const finalScore = score(exercise) - diversityPenalty;

      rankedCategoryCounts.set(categoryKey, categorySeen + 1);
      rankedVariationCounts.set(variationKey, variationSeen + 1);

      return { exercise, finalScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .map(({ exercise }) => ({
      ...exercise,
      fitReasons: exercise.fitReasons ?? describeExerciseFit(exercise, preferences),
    }));
};
