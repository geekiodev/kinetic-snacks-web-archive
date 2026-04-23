import { ArrowLeft, Camera, Sparkles, AlertCircle, Crown, RefreshCw, Clock, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Exercise, UserPreferences } from '../App';
import { loadLimitationRules, LimitationRuleMap } from '../lib/exerciseValidation';

interface SpaceAnalysisProps {
  onBack: () => void;
  isPremium: boolean;
  onUpgrade: () => void;
  userId: string | null;
  userPreferences: UserPreferences;
  onStartExercise: (exercise: Exercise) => void;
}

interface SpaceOverview {
  dimensions: string;
  usableSpace: string;
  detectedEquipment: string[];
  floorType: string;
  obstacles: string[];
  safetyNotes: string[];
}

// Resize and compress an image file before sending to the edge function.
async function compressImage(
  file: File,
  maxDimension = 1280,
  quality = 0.82,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression.'));
    };

    img.src = objectUrl;
  });
}

export default function SpaceAnalysis({
  onBack,
  isPremium,
  onUpgrade,
  userId,
  userPreferences,
  onStartExercise,
}: SpaceAnalysisProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(true);
  const [overview, setOverview] = useState<SpaceOverview | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load the most recent analysis on mount so users don't have to re-upload.
  useEffect(() => {
    const loadPreviousAnalysis = async () => {
      if (!userId || !isPremium) {
        setIsLoadingPrevious(false);
        return;
      }

      const { data: analysisRows } = await supabase
        .from('space_analyses')
        .select('analysis')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!analysisRows?.analysis) {
        setIsLoadingPrevious(false);
        return;
      }

      const analysis = analysisRows.analysis as SpaceOverview & { exercise_ids?: string[] };
      const exerciseIds = analysis.exercise_ids ?? [];

      if (exerciseIds.length > 0) {
        const [{ data: exerciseRows }, limitationRules] = await Promise.all([
          supabase
            .from('exercises')
            .select('id,title,duration_minutes,intensity,equipment,instructions,tips,category,movement_tags,body_region_tags,context_tags,location_tags,contraindication_tags,requires_floor,standing_only,no_sweat,source_type,review_status')
            .in('id', exerciseIds)
            .eq('is_active', true),
          loadLimitationRules(),
        ]);

        if (exerciseRows && exerciseRows.length > 0) {
          const mapped = mapExerciseRows(exerciseRows);
          const safe = mapped.filter((ex) => isSafeForLimitations(ex, userPreferences.limitations, limitationRules));
          setOverview(analysis);
          setExercises(safe);
        }
      }

      setIsLoadingPrevious(false);
    };

    void loadPreviousAnalysis();
  }, [userId, isPremium]);

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-stone-50 smooth-scroll safe-bottom">
        <header className="glass-effect border-b border-stone-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={onBack}
              className="touch-target flex items-center gap-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-smooth"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Crown className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Premium Feature</h1>
          <p className="text-lg text-slate-600 mb-8">
            Space Analysis is available with a Premium subscription. Unlock AI-powered room
            optimization and get personalized exercise recommendations for your space.
          </p>
          <button
            onClick={onUpgrade}
            className="touch-target bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setOverview(null);
    setExercises([]);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const compressed = await compressImage(file);
      setCompressedImage(compressed);
    } catch {
      setError('Could not process this image. Please try a different file.');
      setImagePreview(null);
    }
  };

  const handleAnalyze = async () => {
    if (!compressedImage) return;
    setIsAnalyzing(true);
    setError(null);

    const { data, error: fnError } = await supabase.functions.invoke('analyze-space', {
      body: {
        imageBase64: compressedImage.base64,
        mimeType:    compressedImage.mimeType,
      },
    });

    setIsAnalyzing(false);

    if (fnError || !data?.overview || !data?.exercises) {
      setError(fnError?.message ?? 'Analysis failed. Please try again with a clearer photo.');
      return;
    }

    const limitationRules = await loadLimitationRules();
    const safeExercises = (data.exercises as Exercise[]).filter(
      (ex) => isSafeForLimitations(ex, userPreferences.limitations, limitationRules),
    );

    setOverview(data.overview as SpaceOverview);
    setExercises(safeExercises);
    setImagePreview(null);
    setCompressedImage(null);
  };

  const handleReset = () => {
    setImagePreview(null);
    setCompressedImage(null);
    setOverview(null);
    setExercises([]);
    setError(null);
  };

  const hasResults = overview !== null && exercises.length > 0;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          {hasResults && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              New Analysis
            </button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Space Analysis</h1>
          <p className="text-slate-600">
            Upload a photo of your space and get AI-generated exercises tailored to exactly
            what&apos;s in your room — ready to start immediately.
          </p>
        </div>

        {/* Loading previous */}
        {isLoadingPrevious && (
          <div className="text-sm text-slate-500 py-4">Loading your last analysis…</div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload — shown when no results and no image preview */}
        {!isLoadingPrevious && !hasResults && !imagePreview && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100">
            <label
              htmlFor="image-upload"
              className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-xl p-12 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all"
            >
              <Camera className="w-16 h-16 text-slate-400 mb-4" />
              <p className="text-lg font-semibold text-slate-900 mb-2">
                Upload a photo of your space
              </p>
              <p className="text-sm text-slate-500 text-center">
                Include your room, any equipment, and the area you plan to exercise in.
                JPG, PNG, or WebP.
              </p>
              <input
                id="image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Image preview + analyze button */}
        {imagePreview && !hasResults && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Your Space</h2>
              {!isAnalyzing && (
                <label
                  htmlFor="image-upload-change"
                  className="text-sm text-orange-600 hover:text-orange-700 cursor-pointer font-medium"
                >
                  Change Photo
                  <input
                    id="image-upload-change"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <img src={imagePreview} alt="Your space" className="w-full rounded-xl" />

            {!isAnalyzing && (
              <button
                onClick={handleAnalyze}
                disabled={!compressedImage}
                className="w-full mt-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white font-semibold px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Sparkles className="w-5 h-5" />
                Analyze with AI
              </button>
            )}

            {isAnalyzing && (
              <div className="mt-4 bg-orange-50 rounded-xl p-6 text-center border border-orange-200">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-orange-900 font-medium text-sm">Analyzing your space…</p>
                <p className="text-orange-700 text-xs mt-1">Generating exercises tailored to your room. Usually 5–15 seconds.</p>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {hasResults && overview && (
          <div className="space-y-6">
            {/* Space overview */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-600" />
                Space Overview
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Dimensions</p>
                  <p className="text-sm text-slate-800">{overview.dimensions}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Floor Type</p>
                  <p className="text-sm text-slate-800 capitalize">{overview.floorType}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Usable Area</p>
                  <p className="text-sm text-slate-800">{overview.usableSpace}</p>
                </div>
              </div>

              {overview.detectedEquipment.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Equipment Detected</p>
                  <div className="flex flex-wrap gap-2">
                    {overview.detectedEquipment.map((item) => (
                      <span key={item} className="px-3 py-1 bg-orange-100 text-orange-700 font-medium rounded-lg text-sm">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {overview.obstacles.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Space Constraints</p>
                  <ul className="space-y-1">
                    {overview.obstacles.map((o) => (
                      <li key={o} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-slate-400 mt-0.5 flex-shrink-0">–</span>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Exercise cards */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">
                Your Space Snacks
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                AI-generated exercises tailored to your room. Tap any to start.
              </p>
              <div className="space-y-3">
                {exercises.map((exercise) => (
                  <SpaceExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onStart={() => onStartExercise(exercise)}
                  />
                ))}
              </div>
            </div>

            {/* Safety notes */}
            {overview.safetyNotes.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Safety Reminders
                </h2>
                <ul className="space-y-2">
                  {overview.safetyNotes.map((note) => (
                    <li key={note} className="text-amber-800 text-sm flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Space Exercise Card ──────────────────────────────────────────────────────

interface SpaceExerciseCardProps {
  exercise: Exercise;
  onStart: () => void;
}

function SpaceExerciseCard({ exercise, onStart }: SpaceExerciseCardProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-stone-100 hover:border-orange-300 shadow-sm hover:shadow-md transition-all p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 text-base mb-1">{exercise.title}</h3>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5" />
              {exercise.duration} min
            </span>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
              {exercise.category}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              exercise.intensity === 'low'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {exercise.intensity}
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{exercise.tips}</p>
          {exercise.equipment.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {exercise.equipment.map((item) => (
                <span key={item} className="px-2 py-0.5 bg-stone-100 text-slate-600 rounded text-xs font-medium">
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onStart}
          className="flex-shrink-0 flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <Zap className="w-4 h-4" />
          Start
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safety-only filter for Space Analysis exercises.
 * Unlike the daily snack pipeline we intentionally skip equipment/intensity/duration
 * checks — the AI already tailored those to the detected space. We only reject
 * exercises that conflict with the user's physical limitations.
 */
function isSafeForLimitations(
  exercise: Exercise,
  limitations: string[],
  limitationRules: LimitationRuleMap,
): boolean {
  const activeLimitations = limitations.filter((l) => l.toLowerCase() !== 'none');
  if (activeLimitations.length === 0) return true;

  const normalize = (s: string) => s.trim().toLowerCase();

  // Check contraindication tags
  const contraTags = new Set((exercise.contraindicationTags ?? []).map(normalize));
  if (activeLimitations.map(normalize).some((l) => contraTags.has(l))) return false;

  // Check keyword rules (title, instructions, tags)
  const keywords = activeLimitations.map(normalize).flatMap((l) => limitationRules[l] ?? []);
  if (keywords.length === 0) return true;

  const haystack = [
    exercise.title,
    exercise.tips,
    exercise.category,
    ...(exercise.movementTags ?? []),
    ...(exercise.bodyRegionTags ?? []),
    ...exercise.instructions,
  ]
    .filter(Boolean)
    .map(normalize)
    .join(' ');

  return !keywords.some((kw) => haystack.includes(kw));
}

function mapExerciseRows(rows: Record<string, unknown>[]): Exercise[] {
  return rows.map((row) => ({
    id:                  row.id as string,
    title:               row.title as string,
    duration:            row.duration_minutes as number,
    intensity:           (row.intensity === 'high' ? 'medium' : row.intensity) as 'low' | 'medium',
    equipment:           (row.equipment as string[]) ?? [],
    instructions:        (row.instructions as string[]) ?? [],
    tips:                (row.tips as string) ?? '',
    category:            (row.category as string) ?? 'General',
    movementTags:        (row.movement_tags as string[]) ?? [],
    bodyRegionTags:      (row.body_region_tags as string[]) ?? [],
    contextTags:         (row.context_tags as string[]) ?? [],
    locationTags:        (row.location_tags as string[]) ?? [],
    contraindicationTags: (row.contraindication_tags as string[]) ?? [],
    requiresFloor:       (row.requires_floor as boolean) ?? false,
    standingOnly:        (row.standing_only as boolean) ?? false,
    noSweat:             (row.no_sweat as boolean) ?? true,
    sourceType:          row.source_type as Exercise['sourceType'],
    reviewStatus:        row.review_status as Exercise['reviewStatus'],
  }));
}
