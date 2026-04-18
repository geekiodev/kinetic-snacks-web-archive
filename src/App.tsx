import { useEffect, useRef, useState } from 'react';
import Landing from './components/Landing';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import ExerciseDetail from './components/ExerciseDetail';
import Settings from './components/Settings';
import SpaceAnalysis from './components/SpaceAnalysis';
import Auth from './components/Auth';
import Pricing from './components/Pricing';
import PaymentModal from './components/PaymentModal';
import { supabase } from './lib/supabase';
import { NotificationSettings, defaultNotificationSettings, normalizeNotificationSettings } from './lib/notificationSettings';

export type View = 'landing' | 'auth' | 'onboarding' | 'pricing' | 'dashboard' | 'exercise' | 'settings' | 'space-analysis';
export type SubscriptionPlan = 'free' | 'premium';

export interface UserPreferences {
  limitations: string[];
  equipment: string[];
  location: string[];
  intensityLevel: string;
  duration: number;
  notificationSettings?: NotificationSettings;
}


interface NotificationPreferencesRow {
  push_enabled: boolean;
  /** Present on write and when DB has been migrated; optional on read for older schemas. */
  timezone?: string;
  quiet_hours_enabled: boolean;
  quiet_start_local: string;
  quiet_end_local: string;
  reminder_window: 'anytime' | 'morning' | 'midday' | 'evening';
  max_daily_notifications_override: number | null;
}

const mapNotificationRowToSettings = (
  row: NotificationPreferencesRow | null | undefined,
): NotificationSettings =>
  normalizeNotificationSettings(
    row
      ? {
          pushEnabled: row.push_enabled,
          quietHoursEnabled: row.quiet_hours_enabled,
          quietStartLocal: row.quiet_start_local,
          quietEndLocal: row.quiet_end_local,
          reminderWindow: row.reminder_window,
          maxDailyNotifications: row.max_daily_notifications_override,
        }
      : defaultNotificationSettings,
  );

const mapNotificationSettingsToRow = (
  settings: NotificationSettings,
  timezone: string,
): NotificationPreferencesRow => ({
  push_enabled: settings.pushEnabled,
  timezone,
  quiet_hours_enabled: settings.quietHoursEnabled,
  quiet_start_local: settings.quietStartLocal,
  quiet_end_local: settings.quietEndLocal,
  reminder_window: settings.reminderWindow,
  max_daily_notifications_override: settings.maxDailyNotifications,
});

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Exercise {
  id: string;
  title: string;
  duration: number;
  intensity: 'low' | 'medium';
  equipment: string[];
  instructions: string[];
  tips: string;
  scheduledTime?: string;
  category: string;
  movementTags?: string[];
  bodyRegionTags?: string[];
  contextTags?: string[];
  locationTags?: string[];
  contraindicationTags?: string[];
  requiresFloor?: boolean;
  standingOnly?: boolean;
  noSweat?: boolean;
  variationKey?: string;
  fitReasons?: string[];
  sourceType?: 'curated_seed' | 'generated_template' | 'reviewed_generated';
  reviewStatus?: 'approved' | 'pending' | 'rejected';
}

function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [completedSlotId, setCompletedSlotId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>('free');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [, setIsAuthReady] = useState(false);
  const authReadyRef = useRef(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    limitations: [],
    equipment: [],
    location: [],
    intensityLevel: 'low',
    duration: 5,
    notificationSettings: defaultNotificationSettings,
  });

  const hasCompletePreferences = (preferences: UserPreferences | null | undefined) => {
    if (!preferences) return false;
    const hasDuration = Number.isFinite(preferences.duration) && preferences.duration > 0;
    const hasIntensity = preferences.intensityLevel === 'low' || preferences.intensityLevel === 'medium';
    const hasLocations = Array.isArray(preferences.location) && preferences.location.length > 0;
    return hasDuration && hasIntensity && hasLocations;
  };

  const loadProfile = async (userId: string) => {
    setProfileLoadError(null);
    const [{ data, error }, { data: notificationData, error: notificationError }] = await Promise.all([
      supabase
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('notification_preferences')
        .select(
          'push_enabled,quiet_hours_enabled,quiet_start_local,quiet_end_local,reminder_window,max_daily_notifications_override',
        )
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      setProfileLoadError(error.message);
      return false;
    }

    if (notificationError && notificationError.code !== 'PGRST116') {
      setProfileLoadError(notificationError.message);
      return false;
    }

    const preferences = data?.preferences as UserPreferences | null;
    if (hasCompletePreferences(preferences) && preferences) {
      setUserPreferences({
        ...preferences,
        notificationSettings: mapNotificationRowToSettings(notificationData as NotificationPreferencesRow | null | undefined),
      });
      return true;
    }

    return false;
  };

  const handleSessionUser = async (sessionUser: { id: string; email?: string; user_metadata?: { name?: string } }) => {
    const appUser = {
      id: sessionUser.id,
      name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'User',
      email: sessionUser.email || '',
    };
    setUser(appUser);
    return loadProfile(sessionUser.id);
  };

  useEffect(() => {
    let isMounted = true;

    const markAuthReady = () => {
      authReadyRef.current = true;
      setIsAuthReady(true);
    };

    const loadStoredSession = () => {
      try {
        const stored = window.localStorage.getItem(supabase.auth.storageKey);
        if (!stored) return null;
        const parsed = JSON.parse(stored) as {
          access_token?: string;
          refresh_token?: string;
          user?: { id: string; email?: string; user_metadata?: { name?: string } };
        };
        return parsed;
      } catch {
        return null;
      }
    };

    const readyTimeout = window.setTimeout(() => {
      if (isMounted && !authReadyRef.current) {
        markAuthReady();
      }
    }, 2000);

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        const hasProfile = await handleSessionUser(session.user);
        if (!isMounted) return;
        setCurrentView(hasProfile ? 'dashboard' : 'onboarding');
      } else {
        setUser(null);
        setProfileLoadError(null);
        if (authReadyRef.current) {
          setCurrentView('landing');
        }
      }

      if (event === 'INITIAL_SESSION') {
        markAuthReady();
      }
    });

    const bootstrapFromStorage = async (attempts = 5, intervalMs = 400) => {
      for (let i = 0; i < attempts; i += 1) {
        const storedSession = loadStoredSession();
        if (storedSession?.user?.email) {
          const { data } = await supabase.auth.getSession();
          if (!data.session && storedSession.access_token && storedSession.refresh_token) {
            await supabase.auth.setSession({
              access_token: storedSession.access_token,
              refresh_token: storedSession.refresh_token,
            });
          }

          const hasProfile = await handleSessionUser(storedSession.user);
          if (!isMounted) return;
          setCurrentView(hasProfile ? 'dashboard' : 'onboarding');
          markAuthReady();
          return;
        }
        if (i < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }
    };

    bootstrapFromStorage();

    return () => {
      isMounted = false;
      window.clearTimeout(readyTimeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user || currentView === 'dashboard') {
      return;
    }

    let isActive = true;
    const intervalMs = 400;
    const maxChecks = 20;
    let checks = 0;

    const checkStoredSession = async () => {
      if (!isActive) return;
      checks += 1;

      try {
        const storedSession = loadStoredSession();
        if (storedSession?.user?.email) {
          const { data } = await supabase.auth.getSession();
          if (!data.session && storedSession.access_token && storedSession.refresh_token) {
            await supabase.auth.setSession({
              access_token: storedSession.access_token,
              refresh_token: storedSession.refresh_token,
            });
          }

          const hasProfile = await handleSessionUser(storedSession.user);
            if (!isActive) return;
            setCurrentView(hasProfile ? 'dashboard' : 'onboarding');
            return;
        }
      } catch {
        // ignore parse errors
      }

      if (checks < maxChecks) {
        window.setTimeout(checkStoredSession, intervalMs);
      }
    };

    checkStoredSession();

    return () => {
      isActive = false;
    };
  }, [currentView, user]);

  const handleViewChange = (view: View, exercise?: Exercise) => {
    setCurrentView(view);
    if (exercise) {
      setSelectedExercise(exercise);
    }
  };

  const handleAuthSuccess = async (userData: User) => {
    setUser(userData);
    const hasProfile = await loadProfile(userData.id);
    setCurrentView(hasProfile ? 'dashboard' : 'onboarding');
  };

  const handleOnboardingComplete = async (preferences: UserPreferences) => {
    const normalizedPreferences = {
      ...preferences,
      notificationSettings: normalizeNotificationSettings(preferences.notificationSettings),
    };
    setUserPreferences(normalizedPreferences);
    if (user) {
      await supabase
        .from('profiles')
        .update({
          preferences: normalizedPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...mapNotificationSettingsToRow(
            normalizeNotificationSettings(normalizedPreferences.notificationSettings),
            Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          ),
          updated_at: new Date().toISOString(),
        });
    }
    setCurrentView('pricing');
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (plan === 'free') {
      setSubscriptionPlan('free');
      setCurrentView('dashboard');
    } else {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSubscriptionPlan('premium');
    setCurrentView('dashboard');
  };

  const handleExerciseComplete = async (exercise: Exercise) => {
    if (!user) {
      throw new Error('Please sign in to save your progress.');
    }

    const { error } = await supabase.from('exercise_completions').insert({
      user_id: user.id,
      exercise_id: exercise.id,
      duration_minutes: exercise.duration,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }

    if (selectedSlotId) {
      await supabase
        .from('daily_snack_assignments')
        .update({ status: 'completed' })
        .eq('id', selectedSlotId);
      setCompletedSlotId(selectedSlotId);
    }
  };

  const handleUpgradeToPremium = () => {
    setShowPaymentModal(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSubscriptionPlan('free');
    setCurrentView('landing');
    setProfileLoadError(null);
    setUserPreferences({
      limitations: [],
      equipment: [],
      location: [],
      intensityLevel: 'low',
      duration: 5,
      notificationSettings: defaultNotificationSettings,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {profileLoadError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-3">
          Unable to load your profile. Please check your Supabase settings and try again.
        </div>
      )}
      {currentView === 'landing' && (
        <Landing onGetStarted={() => setCurrentView('auth')} />
      )}

      {currentView === 'auth' && (
        <Auth onAuthSuccess={handleAuthSuccess} />
      )}

      {currentView === 'onboarding' && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      {currentView === 'pricing' && (
        <Pricing
          onSelectPlan={handleSelectPlan}
          onSkip={() => {
            setSubscriptionPlan('free');
            setCurrentView('dashboard');
          }}
        />
      )}

      {currentView === 'dashboard' && (
        <Dashboard
          onViewExercise={(exercise, slotId) => {
            setSelectedSlotId(slotId ?? null);
            handleViewChange('exercise', exercise);
          }}
          onNavigate={handleViewChange}
          userId={user?.id || null}
          userPreferences={userPreferences}
          subscriptionPlan={subscriptionPlan}
          onUpgrade={handleUpgradeToPremium}
          completedSlotId={completedSlotId}
        />
      )}

      {currentView === 'exercise' && selectedExercise && (
        <ExerciseDetail
          exercise={selectedExercise}
          onBack={() => setCurrentView('dashboard')}
          onComplete={handleExerciseComplete}
        />
      )}

      {currentView === 'settings' && (
      <Settings
        preferences={userPreferences}
        user={user}
        onSave={async (prefs) => {
          setProfileLoadError(null);
          if (!user) {
            setProfileLoadError('Please sign in again to save your preferences.');
            return;
          }

          const normalizedNotificationSettings = normalizeNotificationSettings(prefs.notificationSettings);
          const { error } = await supabase.from('profiles').update({
            preferences: {
              ...prefs,
              notificationSettings: normalizedNotificationSettings,
            },
            updated_at: new Date().toISOString(),
          }).eq('id', user.id);

          if (!error) {
            const { error: notificationError } = await supabase
              .from('notification_preferences')
              .upsert({
                user_id: user.id,
                ...mapNotificationSettingsToRow(
                  normalizedNotificationSettings,
                  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                ),
                updated_at: new Date().toISOString(),
              });

            if (notificationError) {
              setProfileLoadError(notificationError.message);
              return;
            }
          }

          if (error) {
            setProfileLoadError(error.message);
            return;
          }

          setUserPreferences({
            ...prefs,
            notificationSettings: normalizedNotificationSettings,
          });
          setCurrentView('dashboard');
        }}
        onSignOut={handleSignOut}
        onBack={() => setCurrentView('dashboard')}
      />
      )}

      {currentView === 'space-analysis' && (
        <SpaceAnalysis
          onBack={() => setCurrentView('dashboard')}
          isPremium={subscriptionPlan === 'premium'}
          onUpgrade={handleUpgradeToPremium}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

export default App;
