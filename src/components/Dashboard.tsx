import { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  Settings,
  Camera,
  Zap,
  Flame,
  Award,
  Crown,
  Lock,
  Sparkles,
  FastForward,
  X,
  Shuffle,
} from 'lucide-react';
import { Exercise, UserPreferences, View, SubscriptionPlan } from '../App';
import { supabase } from '../lib/supabase';
import { loadLimitationRules, validateExerciseCandidate, isSafeForLimitations } from '../lib/exerciseValidation';
import { generateExercises, rankExercises } from '../lib/exerciseGenerator';

interface DashboardProps {
  onViewExercise: (exercise: Exercise, slotId?: string) => void;
  onNavigate: (view: View) => void;
  userId: string | null;
  userPreferences: UserPreferences;
  subscriptionPlan: SubscriptionPlan;
  onUpgrade: () => void;
  completedSlotId?: string | null;
}

const HISTORY_LOOKBACK_DAYS = 30;
const MIN_EXERCISE_COUNT = 3;

type DaySlot = {
  id: string;
  status: string;
  exercise_id: string;
  scheduled_at: string | null;
  scheduled_at_local: string | null;
  source: string;
};

export default function Dashboard({ onViewExercise, onNavigate, userId, userPreferences, subscriptionPlan, onUpgrade, completedSlotId }: DashboardProps) {
  const [greeting, setGreeting] = useState('');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [hasLoadedStats, setHasLoadedStats] = useState(false);
  const [recentCompletions, setRecentCompletions] = useState<Array<{ exerciseId: string; completedAt: string }>>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [exerciseError, setExerciseError] = useState('');
  const [nudgeStatus, setNudgeStatus] = useState<string | null>(null);
  const [todaySlots, setTodaySlots] = useState<DaySlot[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [slotLimit, setSlotLimit] = useState<number | null>(null);
  const [swapsRemaining, setSwapsRemaining] = useState<number | null>(1);
  const [isAssigningSnack, setIsAssigningSnack] = useState(false);
  const [planTrigger, setPlanTrigger] = useState(0);

  const isPlanningRef = useRef(false);
  const isDevResetRef = useRef(false);
  const [snoozingSlotId, setSnoozingSlotId] = useState<string | null>(null);
  // Full limitation-safe exercise pool for Surprise Me — not filtered by
  // intensity/duration/equipment so the surprise can reach outside normal preferences.
  const surprisePoolRef = useRef<Exercise[]>([]);
  const lastSurprisedIdRef = useRef<string | null>(null);

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
        .gte('completed_at', new Date(Date.now() - HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString());

      if (error || !data) {
        setCurrentStreak(0);
        setTodayCount(0);
        setWeeklyCount(0);
        setWeeklyMinutes(0);
        setRecentCompletions([]);
        setHasLoadedStats(true);
        return;
      }

      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const toDateKey = (value: string) =>
        new Date(value).toLocaleDateString('sv-SE', { timeZone: localTz });

      const todayKey = new Date().toLocaleDateString('sv-SE', { timeZone: localTz });
      const weekStart = new Date();
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
    const loadNudgePreview = async () => {
      if (!userId) {
        setNudgeStatus(null);
        return;
      }

      const planResponse = await supabase.functions.invoke('notifications-plan', {
        body: {
          dry_run: true,
          now_utc: new Date().toISOString(),
        },
      });

      if (!planResponse) {
        setNudgeStatus(null);
        return;
      }

      const { data, error } = planResponse;

      if (error || !data) {
        setNudgeStatus(null);
        return;
      }

      if (data.send_now) {
        setNudgeStatus('Great timing — you are in an ideal snack window right now.');
        return;
      }

      if (data.reason === 'quiet_hours') {
        setNudgeStatus('Quiet hours are active. We will wait until your wake window to send nudges.');
        return;
      }

      if (data.reason === 'daily_cap_reached') {
        setNudgeStatus("You have reached today's nudge cap. We'll resume tomorrow.");
        return;
      }

      setNudgeStatus(null);
    };

    void loadNudgePreview();
  }, [userId, isPremium]);

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

        // Surprise Me pool: limitations-only filter, no intensity/duration/equipment gate.
        // This gives genuine variety — the surprise can step outside normal preferences safely.
        surprisePoolRef.current = mapped.filter((ex) =>
          isSafeForLimitations(ex, userPreferences.limitations, limitationRules),
        );

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

        if (ranked.length < MIN_EXERCISE_COUNT) {
          const generated = await generateExercises({
            preferences: userPreferences,
            count: MIN_EXERCISE_COUNT - ranked.length,
            history: {
              recentExerciseIds,
              recentVariationKeys,
              categoryCounts,
            },
          });
          const validatedGenerated = generated.filter((exercise) =>
            validateExerciseCandidate(exercise, userPreferences, limitationRules).valid
          );
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

  useEffect(() => {
    const loadDayPlan = async () => {
      if (exercises.length === 0) return;

      // In-flight guard: prevent concurrent calls (e.g. from rapid exercises
      // state updates), but allow re-runs once the current call completes so
      // that config changes in the DB are always picked up.
      if (isPlanningRef.current) return;
      isPlanningRef.current = true;

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const dayKey = new Date().toLocaleDateString('sv-SE', { timeZone: timezone });

      try {
        if (!userId) {
          // Unauthenticated preview: synthesise a single pending slot.
          setTodaySlots([{
            id: 'preview',
            status: 'notified',
            exercise_id: exercises[0].id,
            scheduled_at: null,
            scheduled_at_local: null,
            source: 'auto',
          }]);
          setActiveSlotId('preview');
          setSwapsRemaining(1);
          return;
        }

        const devMode = isDevResetRef.current;
        isDevResetRef.current = false;

        const { data, error } = await supabase.functions.invoke('allow-snack-assignment', {
          body: {
            action: 'plan',
            day_key: dayKey,
            timezone,
            candidate_exercise_ids: exercises.map((e) => e.id),
            ...(devMode && { dev_mode: true }),
          },
        });

        if (error || !data) return;

        const slots = (data.slots ?? []) as DaySlot[];
        setTodaySlots(slots);

        const active = data.active_slot as { id: string } | null;
        setActiveSlotId(active?.id ?? null);

        if (typeof data.slot_limit === 'number') setSlotLimit(data.slot_limit);
        else if (data.slot_limit === null) setSlotLimit(null);

        if (typeof data.remaining_swaps === 'number') setSwapsRemaining(data.remaining_swaps);
        else if (data.remaining_swaps === null) setSwapsRemaining(null);
      } finally {
        isPlanningRef.current = false;
      }
    };

    void loadDayPlan();
  }, [exercises, userId, planTrigger, subscriptionPlan]);

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

  // Re-fetch the plan whenever the user returns to the tab so that any
  // config changes made in the DB are reflected without a full page reload.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setPlanTrigger((n) => n + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleDevReset = async () => {
    if (!userId) return;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dayKey = new Date().toLocaleDateString('sv-SE', { timeZone: timezone });
    await supabase
      .from('daily_snack_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('day_key', dayKey);
    setTodaySlots([]);
    setActiveSlotId(null);
    setSlotLimit(null);
    setSwapsRemaining(1);
    isDevResetRef.current = true;
    setPlanTrigger((n) => n + 1);
  };

  // Sync completion back from App when user finishes an exercise.
  // For premium users (unlimited slots), also trigger a re-plan so the next
  // slot is scheduled immediately rather than waiting for a page reload.
  useEffect(() => {
    if (!completedSlotId) return;
    setTodaySlots((prev) =>
      prev.map((s) => s.id === completedSlotId ? { ...s, status: 'completed' } : s)
    );
    setActiveSlotId(null);
    if (subscriptionPlan === 'premium') {
      setPlanTrigger((n) => n + 1);
    }
  }, [completedSlotId]);

  // A slot is "ready" if it has arrived (scheduled_at <= now) or is already active/notified.
  const isSlotReady = (slot: DaySlot): boolean => {
    if (slot.status === 'notified' || slot.status === 'active') return true;
    if (slot.status === 'pending') {
      if (!slot.scheduled_at) return true;
      return new Date(slot.scheduled_at).getTime() <= Date.now();
    }
    return false;
  };

  // Derived quota values — update automatically when todaySlots changes.
  const slotsConsumed = todaySlots.filter((s) => s.status === 'completed').length;
  const freeRemaining = slotLimit !== null ? Math.max(0, slotLimit - slotsConsumed) : null;

  // Derive next-slot time from the earliest not-yet-ready pending slot.
  const nextPendingSlot = todaySlots
    .filter((s) => s.status === 'pending' && s.scheduled_at && new Date(s.scheduled_at).getTime() > Date.now())
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0] ?? null;
  const nextSlotLocalTime = nextPendingSlot?.scheduled_at_local ?? null;

  // Only surface the current slot when the quota allows and a ready slot exists.
  const currentSlot = (freeRemaining === null || freeRemaining > 0)
    ? (todaySlots.find((s) => s.id === activeSlotId && isSlotReady(s))
        ?? todaySlots.find((s) => isSlotReady(s) && (s.status === 'notified' || s.status === 'active'))
        ?? todaySlots.find((s) => isSlotReady(s) && s.status === 'pending')
        ?? null)
    : null;

  const currentExercise = exercises.find((e) => e.id === currentSlot?.exercise_id) ?? null;

  const handleStartAssignedSnack = () => {
    if (!currentExercise || !currentSlot) return;
    onViewExercise(currentExercise, currentSlot.id);
  };

  const handleSwapAssignedSnack = () => {
    if (!currentSlot || exercises.length < 2 || isAssigningSnack) return;

    if (!isPremium && swapsRemaining !== null && swapsRemaining <= 0) {
      setExerciseError('You have used your free daily swap. Upgrade for unlimited swaps.');
      return;
    }

    const requestSwap = async () => {
      setIsAssigningSnack(true);
      const swapTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data, error } = await supabase.functions.invoke('allow-snack-assignment', {
        body: {
          action: 'swap',
          day_key: new Date().toLocaleDateString('sv-SE', { timeZone: swapTimezone }),
          timezone: swapTimezone,
          swap_slot_id: currentSlot.id,
          candidate_exercise_ids: exercises.map((e) => e.id),
        },
      });

      if (error || !data) {
        setExerciseError(error?.message || 'Unable to swap snack right now.');
        setIsAssigningSnack(false);
        return;
      }

      if (data.allowed === false && data.reason === 'swap_limit_reached') {
        setExerciseError('You have used your free daily swap. Upgrade for unlimited swaps.');
        setSwapsRemaining(0);
        setIsAssigningSnack(false);
        return;
      }

      if (typeof data.assigned_exercise_id === 'string') {
        setTodaySlots((prev) =>
          prev.map((s) =>
            s.id === currentSlot.id ? { ...s, exercise_id: data.assigned_exercise_id as string } : s
          )
        );
      }

      if (typeof data.remaining_swaps === 'number') setSwapsRemaining(data.remaining_swaps);
      else if (data.remaining_swaps === null) setSwapsRemaining(null);

      setExerciseError('');
      setIsAssigningSnack(false);
    };

    void requestSwap();
  };

  const handleSnooze = async (slotId: string, minutes: number) => {
    setSnoozingSlotId(null);
    // Optimistic update
    setTodaySlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const base = new Date(s.scheduled_at ?? Date.now());
        const from = base < new Date() ? new Date() : base;
        const newAt = new Date(from.getTime() + minutes * 60_000);
        return { ...s, scheduled_at: newAt.toISOString(), scheduled_at_local: null };
      }),
    );

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { data } = await supabase.functions.invoke('allow-snack-assignment', {
      body: {
        action: 'snooze',
        snooze_slot_id: slotId,
        snooze_minutes: minutes,
        day_key: new Date().toLocaleDateString('sv-SE', { timeZone: tz }),
        timezone: tz,
      },
    });

    if (data?.scheduled_at) {
      setTodaySlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, scheduled_at: data.scheduled_at, scheduled_at_local: data.scheduled_at_local }
            : s,
        ),
      );
    }
  };

  const handleSkip = async (slotId: string) => {
    setSnoozingSlotId(null);
    // Optimistic update
    setTodaySlots((prev) => prev.map((s) => s.id === slotId ? { ...s, status: 'skipped' } : s));

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { data } = await supabase.functions.invoke('allow-snack-assignment', {
      body: {
        action: 'skip',
        skip_slot_id: slotId,
        candidate_exercise_ids: exercises.map((e) => e.id),
        day_key: new Date().toLocaleDateString('sv-SE', { timeZone: tz }),
        timezone: tz,
      },
    });

    if (data?.replacement_slot) {
      setTodaySlots((prev) => [...prev, data.replacement_slot as DaySlot]);
    }
  };

  const handleSurpriseMe = () => {
    if (!isPremium) {
      onUpgrade();
      return;
    }
    const base = surprisePoolRef.current.length > 0 ? surprisePoolRef.current : exercises;
    if (base.length === 0) return;

    // Exclude today's scheduled exercises and the last surprised exercise to
    // guarantee variety on repeated taps.
    const scheduledIds = new Set(todaySlots.map((s) => s.exercise_id));
    let pool = base.filter((e) => !scheduledIds.has(e.id) && e.id !== lastSurprisedIdRef.current);
    // Relax gradually if exclusions leave nothing.
    if (pool.length === 0) pool = base.filter((e) => e.id !== lastSurprisedIdRef.current);
    if (pool.length === 0) pool = base;

    const pick = pool[Math.floor(Math.random() * pool.length)];
    lastSurprisedIdRef.current = pick.id;
    onViewExercise(pick);
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

  const weeklyGoal = slotLimit !== null ? slotLimit * 7 : null;
  const weeklyPercent = weeklyGoal !== null
    ? Math.min(100, Math.round((weeklyCount / weeklyGoal) * 100))
    : null;

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
              {import.meta.env.DEV && (
                <button
                  onClick={handleDevReset}
                  className="touch-target px-2.5 py-1.5 text-xs font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg transition-smooth active:scale-95"
                  title="DEV: reset today's snacks"
                >
                  Reset
                </button>
              )}
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


        {nudgeStatus && (
          <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
            {nudgeStatus}
          </div>
        )}

        {/* Premium Upgrade Banner — only shown when limit is close or reached */}
        {!isPremium && freeRemaining !== null && freeRemaining <= 1 && (
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
                    {freeRemaining === 0
                      ? `You've used all your snacks for today. Upgrade to keep moving whenever you feel like it.`
                      : `1 snack slot left today. Upgrade to move on your schedule, not ours.`
                    }
                  </p>
                  <ul className="space-y-1.5">
                    {['Surprise Me — move any time you feel peckish', '5 pre-planned snacks every day', 'Snooze or skip without losing your slot', 'AI Space Analysis'].map((feature, idx) => (
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
              value={weeklyPercent !== null ? `${weeklyPercent}%` : `${weeklyCount}`}
              subValue={weeklyGoal !== null ? `${weeklyCount} of ${weeklyGoal} snacks` : 'snacks this week'}
            color="bg-orange-500"
            delay="0.2s"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={handleStartAssignedSnack}
            className="touch-target group relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white rounded-2xl p-5 sm:p-6 transition-smooth hover:scale-[1.02] hover:-translate-y-1 shadow-lg hover:shadow-xl text-left"
            disabled={!currentExercise}
          >
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg group-hover:scale-110 transition-smooth">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold">Start Snack</h3>
                </div>
                <p className="text-white/95 text-xs sm:text-sm">
                  Jump into your assigned snack
                </p>
              </div>
              <div className="text-3xl sm:text-4xl opacity-50 group-hover:opacity-75 transition-smooth">
                ⚡
              </div>
            </div>
          </button>

          <button
            onClick={handleSurpriseMe}
            className="touch-target group relative bg-white border-2 border-stone-200 hover:border-violet-400 hover:bg-violet-50 active:scale-95 text-slate-900 rounded-2xl p-5 sm:p-6 transition-smooth hover:scale-[1.02] hover:-translate-y-1 shadow-sm hover:shadow-lg text-left"
          >
            {!isPremium && (
              <div className="absolute top-3 right-3 bg-orange-600 text-white p-1.5 rounded-lg shadow-md">
                <Lock className="w-4 h-4" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-violet-100 p-1.5 sm:p-2 rounded-lg group-hover:scale-110 transition-smooth">
                    <Shuffle className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    Surprise Me
                    {!isPremium && <span className="text-xs font-semibold text-orange-600">PREMIUM</span>}
                  </h3>
                </div>
                <p className="text-slate-600 text-xs sm:text-sm">
                  Feeling peckish? Move right now
                </p>
              </div>
              <div className="text-3xl sm:text-4xl opacity-30 group-hover:opacity-50 transition-smooth">
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

        {/* Today's Snack Plan */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">
              {isPremium ? "Today's Movement Plan" : "Today's Snacks"}
            </h2>
            {isPremium ? (
              <span className="text-sm font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                {slotsConsumed} of 5 done
              </span>
            ) : slotLimit !== null && (
              <span className="text-sm text-slate-500 font-medium">
                {slotsConsumed} of {slotLimit} done
              </span>
            )}
          </div>

          {isLoadingExercises && (
            <div className="text-sm text-slate-500">Loading your snack plan...</div>
          )}
          {!isLoadingExercises && exerciseError && (
            <div className="text-sm text-red-600">{exerciseError}</div>
          )}

          {!isLoadingExercises && !exerciseError && (
            <div className="space-y-3">
              {isPremium ? (
                /* ── Premium full-day timeline ── */
                <>
                  {todaySlots.length === 0 && (
                    <div className="text-sm text-slate-500">Building your movement plan…</div>
                  )}

                  {/* Completed slots */}
                  {todaySlots
                    .filter((s) => s.status === 'completed')
                    .map((slot) => {
                      const ex = exercises.find((e) => e.id === slot.exercise_id);
                      return (
                        <div key={slot.id} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span className="flex-1 font-medium text-emerald-900 line-through decoration-emerald-400">
                            {ex?.title ?? 'Snack'}
                          </span>
                          {slot.scheduled_at_local && (
                            <span className="text-xs text-emerald-600">{slot.scheduled_at_local}</span>
                          )}
                        </div>
                      );
                    })}

                  {/* Current / ready slot */}
                  {currentExercise && currentSlot && (
                    <>
                      <ExerciseCard
                        exercise={currentExercise}
                        onClick={handleStartAssignedSnack}
                        index={0}
                        isAutopilot
                      />
                      <div className="flex items-center gap-2 flex-wrap rounded-xl border border-stone-200 bg-white px-4 py-3">
                        {exercises.length > 1 && (
                          <button
                            type="button"
                            onClick={handleSwapAssignedSnack}
                            disabled={isAssigningSnack}
                            className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                          >
                            {isAssigningSnack ? 'Swapping…' : 'Swap exercise'}
                          </button>
                        )}
                        <span className="text-xs text-slate-400 hidden sm:inline">Not now?</span>
                        <button
                          type="button"
                          onClick={() => setSnoozingSlotId((id) => id === currentSlot.id ? null : currentSlot.id)}
                          className="flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-50"
                        >
                          <FastForward className="w-3 h-3" />
                          Snooze
                        </button>
                        {snoozingSlotId === currentSlot.id && (
                          <>
                            <button type="button" onClick={() => handleSnooze(currentSlot.id, 30)}
                              className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100">
                              +30 min
                            </button>
                            <button type="button" onClick={() => handleSnooze(currentSlot.id, 60)}
                              className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100">
                              +1 hr
                            </button>
                            <button type="button" onClick={() => handleSkip(currentSlot.id)}
                              className="flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-stone-50">
                              <X className="w-3 h-3" />
                              Skip
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {/* Upcoming slots */}
                  {todaySlots
                    .filter((s) => s.status === 'pending' && s.id !== currentSlot?.id && !isSlotReady(s))
                    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
                    .map((slot) => {
                      const ex = exercises.find((e) => e.id === slot.exercise_id);
                      const isExpanded = snoozingSlotId === slot.id;
                      return (
                        <div key={slot.id} className="rounded-xl border border-stone-100 bg-white px-4 py-3 text-sm">
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500 w-16 shrink-0">
                              {slot.scheduled_at_local ?? '—'}
                            </span>
                            <span className="flex-1 font-medium text-slate-700 truncate">
                              {ex?.title ?? 'Snack'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSnoozingSlotId((id) => id === slot.id ? null : slot.id)}
                              className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-stone-50 shrink-0"
                            >
                              <FastForward className="w-3 h-3" />
                              Adjust
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="flex items-center gap-2 mt-2 pl-7 flex-wrap">
                              <button type="button" onClick={() => handleSnooze(slot.id, 30)}
                                className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100">
                                +30 min
                              </button>
                              <button type="button" onClick={() => handleSnooze(slot.id, 60)}
                                className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100">
                                +1 hr
                              </button>
                              <button type="button" onClick={() => handleSkip(slot.id)}
                                className="flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-stone-50">
                                <X className="w-3 h-3" />
                                Skip — find me another time
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {/* Skipped slots */}
                  {todaySlots
                    .filter((s) => s.status === 'skipped')
                    .map((slot) => {
                      const ex = exercises.find((e) => e.id === slot.exercise_id);
                      return (
                        <div key={slot.id} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm opacity-50">
                          <X className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="flex-1 font-medium text-slate-500 line-through">
                            {ex?.title ?? 'Snack'}
                          </span>
                          <span className="text-xs text-slate-400">skipped</span>
                        </div>
                      );
                    })}

                  {/* All done */}
                  {todaySlots.length > 0 && todaySlots.every((s) => s.status === 'completed' || s.status === 'skipped') && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                      <p className="text-sm font-semibold text-emerald-800">Movement plan complete! 🎉</p>
                      <p className="text-xs text-emerald-700 mt-1">Great work today. See you tomorrow.</p>
                    </div>
                  )}
                </>
              ) : (
                /* ── Free user view (unchanged) ── */
                <>
                  {currentExercise && currentSlot && (
                    <>
                      <ExerciseCard
                        exercise={currentExercise}
                        onClick={handleStartAssignedSnack}
                        index={0}
                        isAutopilot
                      />
                      {exercises.length > 1 && (
                        <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
                          <p className="text-sm text-slate-600">Not feeling this one?</p>
                          <button
                            type="button"
                            onClick={handleSwapAssignedSnack}
                            disabled={isAssigningSnack}
                            className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                          >
                            {isAssigningSnack
                              ? 'Swapping...'
                              : `Swap${swapsRemaining !== null ? ` (${swapsRemaining} left)` : ''}`}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {todaySlots.filter((s) => s.status === 'completed').map((slot) => {
                    const ex = exercises.find((e) => e.id === slot.exercise_id);
                    return (
                      <div key={slot.id} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="flex-1 font-medium text-emerald-900 line-through decoration-emerald-400">
                          {ex?.title ?? 'Snack'}
                        </span>
                        {slot.scheduled_at_local && (
                          <span className="text-xs text-emerald-600">{slot.scheduled_at_local}</span>
                        )}
                      </div>
                    );
                  })}

                  {todaySlots.filter((s) => s.status === 'pending' && s.id !== currentSlot?.id && !isSlotReady(s)).length > 0 && (
                    <div className="mt-2 space-y-2">
                      {todaySlots
                        .filter((s) => s.status === 'pending' && s.id !== currentSlot?.id && !isSlotReady(s))
                        .map((slot) => (
                          <div key={slot.id} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white px-4 py-3 text-sm text-slate-600">
                            <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />
                            <span>
                              Next snack at{' '}
                              <span className="font-semibold text-slate-900">{slot.scheduled_at_local ?? '—'}</span>
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {!currentExercise && todaySlots.length === 0 && (
                    <div className="text-sm text-slate-500">
                      No matching snacks found. Update your preferences to broaden options.
                    </div>
                  )}

                  {!currentExercise && todaySlots.length > 0 && todaySlots.every((s) => s.status === 'completed' || s.status === 'skipped') && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                      <p className="text-sm font-semibold text-emerald-800">All done for today! 🎉</p>
                      <p className="text-xs text-emerald-700 mt-1">Your snacks reset tomorrow.</p>
                    </div>
                  )}

                  {nextSlotLocalTime && !currentExercise && (
                    <div className="mt-2 bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center gap-3">
                      <div className="bg-orange-100 p-2.5 rounded-xl">
                        <Calendar className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Your next snack is at {nextSlotLocalTime}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          We&apos;ll remind you when it&apos;s time to move.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
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
  isAutopilot?: boolean;
}

function ExerciseCard({ exercise, onClick, index, isLocked, isAutopilot = false }: ExerciseCardProps) {
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

          {isAutopilot && (
            <span className="mb-2 inline-flex rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-700">
              Auto-picked for you
            </span>
          )}

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
        Start Snack →
      </div>
    </button>
  );
}
