import { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Shuffle,
  Settings,
  Camera,
  Zap,
  Flame,
  Award,
  Crown,
  Lock,
  Sparkles
} from 'lucide-react';
import { Exercise, UserPreferences, View, SubscriptionPlan } from '../App';
import { supabase } from '../lib/supabase';
import { loadLimitationRules, validateExerciseCandidate } from '../lib/exerciseValidation';
import { generateExercises, rankExercises } from '../lib/exerciseGenerator';

interface DashboardProps {
  onViewExercise: (exercise: Exercise) => void;
  onNavigate: (view: View) => void;
  userId: string | null;
  userPreferences: UserPreferences;
  subscriptionPlan: SubscriptionPlan;
  onUpgrade: () => void;
}

export default function Dashboard({ onViewExercise, onNavigate, userId, userPreferences, subscriptionPlan, onUpgrade }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState('today');
  const [greeting, setGreeting] = useState('');
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null);
  const [freeLimit, setFreeLimit] = useState(3);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [hasLoadedStats, setHasLoadedStats] = useState(false);
  const [recentCompletions, setRecentCompletions] = useState<Array<{ exerciseId: string; completedAt: string }>>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [exerciseError, setExerciseError] = useState('');

  const isPremium = subscriptionPlan === 'premium';

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      setHasLoadedStats(false);

      if (!userId) {
        setCurrentStreak(0);
        setTodayCount(0);
        setWeeklyCount(0);
        setWeeklyMinutes(0);
        setRecentCompletions([]);
        setHasLoadedStats(true);
        return;
      }

      const { data, error } = await supabase
        .from('exercise_completions')
        .select('exercise_id, completed_at, duration_minutes')
        .eq('user_id', userId)
        .gte('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error || !data) {
        setCurrentStreak(0);
        setTodayCount(0);
        setWeeklyCount(0);
        setWeeklyMinutes(0);
        setRecentCompletions([]);
        setHasLoadedStats(true);
        return;
      }

      const toDateKey = (value: string) => {
        const date = new Date(value);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      };

      const todayKey = toDateKey(new Date().toISOString());
      const weekStart = new Date();
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - 6);
      const weekStartKey = toDateKey(weekStart.toISOString());

      const dayCounts = new Map<string, number>();
      let weeklyTotal = 0;
      let weeklyDuration = 0;

      for (const entry of data) {
        const key = toDateKey(entry.completed_at);
        dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
        if (key >= weekStartKey) {
          weeklyTotal += 1;
          weeklyDuration += entry.duration_minutes;
        }
      }

      setTodayCount(dayCounts.get(todayKey) || 0);
      setWeeklyCount(weeklyTotal);
      setWeeklyMinutes(weeklyDuration);
      const nextRecentCompletions = data.map((entry) => ({ exerciseId: entry.exercise_id, completedAt: entry.completed_at }));
      setRecentCompletions((current) => {
        if (
          current.length === nextRecentCompletions.length &&
          current.every(
            (entry, index) =>
              entry.exerciseId === nextRecentCompletions[index]?.exerciseId &&
              entry.completedAt === nextRecentCompletions[index]?.completedAt
          )
        ) {
          return current;
        }

        return nextRecentCompletions;
      });

      let streak = 0;
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      while (true) {
        const key = toDateKey(cursor.toISOString());
        if (dayCounts.get(key)) {
          streak += 1;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
      setCurrentStreak(streak);
      setHasLoadedStats(true);
    };

    void loadStats();
  }, [userId]);

  useEffect(() => {
    const loadFreeUsage = async () => {
      if (!userId || isPremium) {
        setFreeRemaining(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke('allow-exercise-view', {
        body: { peek: true },
      });

      if (error || !data) {
        setFreeRemaining(null);
        return;
      }

      const limit = Number(data.limit);
      const remaining = data.remaining === null ? null : Number(data.remaining);
      if (Number.isFinite(limit)) {
        setFreeLimit(limit);
      }
      setFreeRemaining(remaining);
    };

    void loadFreeUsage();
  }, [userId, isPremium, freeLimit]);

  useEffect(() => {
    const loadExercises = async () => {
      if (!hasLoadedStats) {
        return;
      }

      setIsLoadingExercises(true);
      setExerciseError('');
      try {
        const { data, error } = await supabase
          .from('exercises')
          .select('id,title,duration_minutes,intensity,equipment,instructions,tips,category,movement_tags,body_region_tags,context_tags,location_tags,contraindication_tags,requires_floor,standing_only,no_sweat,variation_key,source_type,review_status,is_active')
          .eq('is_active', true);

        if (error || !data) {
          throw new Error(error?.message || 'Failed to load exercises');
        }

        const mapped = data
          .filter((row) => (row.review_status ?? 'approved') === 'approved')
          .map((row) => ({
            id: row.id,
            title: row.title,
            duration: row.duration_minutes,
            intensity: row.intensity === 'high' ? 'medium' : row.intensity,
            equipment: row.equipment ?? [],
            instructions: row.instructions ?? [],
            tips: row.tips ?? '',
            category: row.category ?? 'General',
            movementTags: row.movement_tags ?? [],
            bodyRegionTags: row.body_region_tags ?? [],
            contextTags: row.context_tags ?? [],
            locationTags: row.location_tags ?? [],
            contraindicationTags: row.contraindication_tags ?? [],
            requiresFloor: row.requires_floor ?? false,
            standingOnly: row.standing_only ?? false,
            noSweat: row.no_sweat ?? true,
            variationKey: row.variation_key ?? undefined,
            sourceType: row.source_type ?? 'curated_seed',
            reviewStatus: row.review_status ?? 'approved',
          })) as Exercise[];

        const limitationRules = await loadLimitationRules();
        const filtered = mapped.filter((exercise) =>
          validateExerciseCandidate(exercise, userPreferences, limitationRules).valid
        );
        const recentExerciseIds = recentCompletions.map((entry) => entry.exerciseId);
        const recentVariationKeys = filtered
          .filter((exercise) => recentExerciseIds.includes(exercise.id))
          .map((exercise) => exercise.variationKey)
          .filter((variationKey): variationKey is string => Boolean(variationKey));
        const categoryCounts = filtered
          .filter((exercise) => recentExerciseIds.includes(exercise.id))
          .reduce<Record<string, number>>((acc, exercise) => {
            acc[exercise.category] = (acc[exercise.category] || 0) + 1;
            return acc;
          }, {});
        const ranked = rankExercises({
          preferences: userPreferences,
          exercises: filtered,
          history: {
            recentExerciseIds,
            recentVariationKeys,
            categoryCounts,
          },
        });

        const minCount = 3;
        if (ranked.length < minCount) {
          const generated = await generateExercises({
            preferences: userPreferences,
            count: minCount - ranked.length,
            history: {
              recentExerciseIds,
              recentVariationKeys,
              categoryCounts,
            },
          });
          const validatedGenerated = generated.filter((exercise) =>
            validateExerciseCandidate(exercise, userPreferences, limitationRules).valid
          );
          const persistGenerated = false;
          if (persistGenerated && validatedGenerated.length > 0) {
            void supabase.from('exercises').insert(
              validatedGenerated.map((exercise) => ({
                title: exercise.title,
                duration_minutes: exercise.duration,
                intensity: exercise.intensity,
                equipment: exercise.equipment,
                instructions: exercise.instructions,
                tips: exercise.tips,
                category: exercise.category,
                is_active: false,
              }))
            );
          }
          setExercises(
            rankExercises({
              preferences: userPreferences,
              exercises: [...ranked, ...validatedGenerated],
              history: {
                recentExerciseIds,
                recentVariationKeys,
                categoryCounts,
              },
            })
          );
          return;
        }

        setExercises(ranked);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load exercises.';
        setExerciseError(message);
        setExercises([]);
      } finally {
        setIsLoadingExercises(false);
      }
    };

    void loadExercises();
  }, [hasLoadedStats, userPreferences, recentCompletions]);

  const ensureSession = async (attempts = 2, delayMs = 300) => {
    for (let i = 0; i < attempts; i += 1) {
      const { data } = await supabase.auth.getSession();
      let session = data.session;

      if (!session) {
        try {
          const stored = window.localStorage.getItem(supabase.auth.storageKey);
          if (stored) {
            const parsed = JSON.parse(stored) as { access_token?: string; refresh_token?: string };
            if (parsed.access_token && parsed.refresh_token) {
              await supabase.auth.setSession({
                access_token: parsed.access_token,
                refresh_token: parsed.refresh_token,
              });
              const refreshed = await supabase.auth.getSession();
              session = refreshed.data.session;
            }
          }
        } catch {
          // ignore storage errors
        }
      }

      if (session?.access_token) {
        return true;
      }

      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return false;
  };

  const requestViewPermission = async (exerciseId: string) => {
    if (isPremium) {
      return true;
    }

    if (!userId) {
      onUpgrade();
      return false;
    }

    const hasSession = await ensureSession();
    if (!hasSession) {
      setExerciseError('Please sign in again to verify access.');
      return false;
    }

    const { data, error } = await supabase.functions.invoke('allow-exercise-view', {
      body: { exercise_id: exerciseId },
    });

    if (error && error.message?.includes('401')) {
      await supabase.auth.refreshSession();
      const retry = await supabase.functions.invoke('allow-exercise-view', {
        body: { exercise_id: exerciseId },
      });
      if (retry.error || !retry.data) {
        setExerciseError(retry.error?.message || 'Unable to verify free-tier usage.');
        return false;
      }
      const limit = Number(retry.data.limit);
      const remaining = retry.data.remaining === null ? null : Number(retry.data.remaining);
      if (Number.isFinite(limit)) {
        setFreeLimit(limit);
      }
      setFreeRemaining(remaining);
      if (!retry.data.allowed) {
        onUpgrade();
        return false;
      }
      return true;
    }

    if (error || !data) {
      setExerciseError(error?.message || 'Unable to verify free-tier usage.');
      return false;
    }

    const limit = Number(data.limit);
    const remaining = data.remaining === null ? null : Number(data.remaining);
    if (Number.isFinite(limit)) {
      setFreeLimit(limit);
    }
    setFreeRemaining(remaining);

    if (!data.allowed) {
      onUpgrade();
      return false;
    }

    return true;
  };

  const handleExerciseClick = async (exercise: Exercise) => {
    const allowed = await requestViewPermission(exercise.id);
    if (!allowed) {
      return;
    }
    onViewExercise(exercise);
  };

  const handleRouletteMode = async () => {
    if (exercises.length === 0) {
      return;
    }
    const randomExercise = exercises[Math.floor(Math.random() * exercises.length)];
    const allowed = await requestViewPermission(randomExercise.id);
    if (!allowed) {
      return;
    }
    onViewExercise(randomExercise);
  };

  const handleSpaceAnalysis = async () => {
    const hasSession = await ensureSession();
    if (!hasSession) {
      setExerciseError('Please sign in again to verify access.');
      return;
    }

    const { data, error } = await supabase.functions.invoke('allow-space-analysis', {
      body: {},
    });

    if (error && error.message?.includes('401')) {
      await supabase.auth.refreshSession();
      const retry = await supabase.functions.invoke('allow-space-analysis', {
        body: {},
      });
      if (retry.error || !retry.data) {
        setExerciseError(retry.error?.message || 'Unable to verify space analysis access.');
        return;
      }
      if (!retry.data.allowed) {
        onUpgrade();
        return;
      }
      onNavigate('space-analysis');
      return;
    }

    if (error || !data) {
      setExerciseError(error?.message || 'Unable to verify space analysis access.');
      return;
    }

    if (!data.allowed) {
      onUpgrade();
      return;
    }

    onNavigate('space-analysis');
  };

  const weeklyGoal = 14;
  const weeklyPercent = Math.min(100, Math.round((weeklyCount / weeklyGoal) * 100));

  return (
    <div className="min-h-screen pb-24 bg-stone-50 smooth-scroll">
      {/* Header */}
      <header className="glass-effect border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/kinetic-snacks-logo-horizontal.png"
                alt="Kinetic Snacks"
                className="h-8 sm:h-10"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Streak Display */}
              <div className="flex items-center gap-1.5 sm:gap-2 bg-orange-50 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full border border-orange-200">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                <span className="font-bold text-orange-900 text-sm sm:text-base">{currentStreak}</span>
                <span className="text-xs sm:text-sm text-orange-700 hidden sm:inline">day streak</span>
              </div>

              <button
                onClick={handleSpaceAnalysis}
                className="touch-target p-2.5 sm:p-2 hover:bg-stone-100 rounded-lg transition-smooth active:scale-95"
                title="Space Analysis"
              >
                <Camera className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={() => onNavigate('settings')}
                className="touch-target p-2.5 sm:p-2 hover:bg-stone-100 rounded-lg transition-smooth active:scale-95"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Greeting Section */}
        <div className="mb-6 sm:mb-8 animate-slide-up">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
            {greeting}
          </h1>
          <p className="text-slate-600 text-base sm:text-lg">
            Ready to keep your {currentStreak}-day streak alive?
          </p>
        </div>

        {/* Premium Upgrade Banner */}
        {!isPremium && (
          <div className="mb-6 sm:mb-8 animate-scale-in">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-orange-400 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-8 -translate-x-8"></div>
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-6 h-6 text-white" />
                    <h3 className="text-xl sm:text-2xl font-bold text-white">Upgrade to Premium</h3>
                  </div>
                  <p className="text-white/95 text-sm sm:text-base mb-3">
                    {freeRemaining === null
                      ? `Free usage resets daily. Get unlimited access with Premium.`
                      : freeRemaining > 0
                        ? `${freeRemaining} of ${freeLimit} free exercises remaining today. Get unlimited access!`
                        : `You've reached your daily limit. Upgrade for unlimited exercises!`
                    }
                  </p>
                  <ul className="space-y-1.5">
                    {['Unlimited exercises', 'Space analysis', 'Custom plans', 'Progress tracking'].map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-white/95 text-xs sm:text-sm">
                        <Sparkles className="w-4 h-4 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={onUpgrade}
                  className="touch-target w-full sm:w-auto bg-white hover:bg-orange-50 active:scale-95 text-orange-600 font-bold px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
                >
                  Start Free Trial
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Today's Snacks"
              value={`${todayCount}`}
              subValue={`${todayCount} completed`}
            color="bg-orange-500"
            delay="0s"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Total Time"
              value={`${weeklyMinutes} min`}
              subValue="this week"
            color="bg-orange-500"
            delay="0.1s"
          />
          <StatCard
            icon={<Award className="w-5 h-5" />}
            label="Weekly Goal"
              value={`${weeklyPercent}%`}
              subValue={`${weeklyCount} of ${weeklyGoal} snacks`}
            color="bg-orange-500"
            delay="0.2s"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={handleRouletteMode}
            className="touch-target group relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white rounded-2xl p-5 sm:p-6 transition-smooth hover:scale-[1.02] hover:-translate-y-1 shadow-lg hover:shadow-xl text-left"
          >
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg group-hover:scale-110 transition-smooth">
                    <Shuffle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold">Surprise Me</h3>
                </div>
                <p className="text-white/95 text-xs sm:text-sm">
                  Get a random snack right now
                </p>
              </div>
              <div className="text-3xl sm:text-4xl opacity-50 group-hover:opacity-75 transition-smooth">
                🎲
              </div>
            </div>
          </button>

          <button
            onClick={handleSpaceAnalysis}
            className="touch-target group relative bg-white border-2 border-stone-200 hover:border-orange-400 hover:bg-orange-50 active:scale-95 text-slate-900 rounded-2xl p-5 sm:p-6 transition-smooth hover:scale-[1.02] hover:-translate-y-1 shadow-sm hover:shadow-lg text-left"
          >
            {!isPremium && (
              <div className="absolute top-3 right-3 bg-orange-600 text-white p-1.5 rounded-lg shadow-md">
                <Lock className="w-4 h-4" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-orange-100 p-1.5 sm:p-2 rounded-lg group-hover:scale-110 transition-smooth">
                    <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    Analyze Space
                    {!isPremium && <span className="text-xs font-semibold text-orange-600">PREMIUM</span>}
                  </h3>
                </div>
                <p className="text-slate-600 text-xs sm:text-sm">
                  AI-powered room optimization
                </p>
              </div>
              <div className="text-3xl sm:text-4xl opacity-30 group-hover:opacity-50 transition-smooth">
                📸
              </div>
            </div>
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['today', 'tomorrow', 'this-week'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedDate(period)}
              className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                selectedDate === period
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-orange-50 border border-stone-200 hover:border-orange-300'
              }`}
            >
              {period === 'today' && 'Today'}
              {period === 'tomorrow' && 'Tomorrow'}
              {period === 'this-week' && 'This Week'}
            </button>
          ))}
        </div>

        {/* Scheduled Exercises */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Today's Movement Timeline
            </h2>
            <span className="text-sm text-slate-500 font-medium">
              {exercises.length} snacks scheduled
            </span>
          </div>

          <div className="space-y-3">
            {isLoadingExercises && (
              <div className="text-sm text-slate-500">Loading exercises...</div>
            )}
            {!isLoadingExercises && exerciseError && (
              <div className="text-sm text-red-600">{exerciseError}</div>
            )}
              {!isLoadingExercises && !exerciseError && exercises.map((exercise, index) => {
                const isLocked = !isPremium && freeRemaining === 0;
              return (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                    onClick={() => isLocked ? onUpgrade() : handleExerciseClick(exercise)}
                    index={index}
                  isLocked={isLocked}
                />
              );
            })}
          </div>
        </div>

        {/* Empty State Message */}
        <div className="mt-8 bg-white rounded-2xl p-8 text-center border border-stone-200 shadow-sm">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            AI Scheduling Coming Soon
          </h3>
          <p className="text-slate-600 text-sm">
            Connect your calendar to automatically schedule kinetic snacks in your free time
          </p>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  color: string;
  delay: string;
}

function StatCard({ icon, label, value, subValue, color, delay }: StatCardProps) {
  return (
    <div
      className="group bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-lg border border-stone-100 hover:border-orange-200 transition-smooth hover:-translate-y-1 animate-scale-in"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className={`${color} w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-smooth`}>
          {icon}
        </div>
      </div>
      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl sm:text-3xl font-bold text-slate-900 mb-0.5 sm:mb-1">{value}</p>
      <p className="text-xs sm:text-sm text-slate-600 leading-tight">{subValue}</p>
    </div>
  );
}

interface ExerciseCardProps {
  exercise: Exercise;
  onClick: () => void;
  index: number;
  isLocked?: boolean;
}

function ExerciseCard({ exercise, onClick, index, isLocked }: ExerciseCardProps) {
  return (
    <button
      onClick={onClick}
      className={`touch-target group relative w-full bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-lg active:scale-[0.98] transition-smooth text-left border-2 hover:-translate-y-1 animate-slide-up ${
        isLocked
          ? 'border-stone-200 opacity-75'
          : 'border-stone-100 hover:border-orange-400'
      }`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {isLocked && (
        <>
          <div className="absolute inset-0 bg-stone-100/80 backdrop-blur-sm rounded-xl sm:rounded-2xl z-10"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-xl">
              <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-900 bg-white px-4 py-2 rounded-full shadow-lg">
              Premium Only
            </span>
          </div>
        </>
      )}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex-1">
          {exercise.scheduledTime && (
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-orange-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full mb-2 sm:mb-3 border border-orange-200">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
              <span className="text-xs sm:text-sm font-bold text-orange-900">
                {exercise.scheduledTime}
              </span>
            </div>
          )}

          <h3 className={`text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3 transition-smooth leading-snug ${!isLocked && 'group-hover:text-orange-600'}`}>
            {exercise.title}
          </h3>

          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 flex-wrap mb-2 sm:mb-3">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {exercise.duration} min
            </span>
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
              {exercise.category}
            </span>
            <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-bold ${
              exercise.intensity === 'low'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {exercise.intensity}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2 sm:line-clamp-none">
            {exercise.tips}
          </p>

          {exercise.fitReasons && exercise.fitReasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {exercise.fitReasons.map((reason) => (
                <span
                  key={reason}
                  className="px-2.5 py-1 rounded-full bg-stone-100 text-slate-700 text-[11px] sm:text-xs font-medium border border-stone-200"
                >
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center text-xs sm:text-sm font-semibold text-orange-600 group-hover:text-orange-700">
        Start Exercise →
      </div>
    </button>
  );
}
