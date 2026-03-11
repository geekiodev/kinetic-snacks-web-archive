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

export type View = 'landing' | 'auth' | 'onboarding' | 'pricing' | 'dashboard' | 'exercise' | 'settings' | 'space-analysis';
export type SubscriptionPlan = 'free' | 'premium';

export interface UserPreferences {
  limitations: string[];
  equipment: string[];
  location: string[];
  intensityLevel: string;
  duration: number;
}

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
}

function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>('free');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const authReadyRef = useRef(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    limitations: [],
    equipment: [],
    location: [],
    intensityLevel: 'low',
    duration: 5,
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
    const { data, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (error) {
      setProfileLoadError(error.message);
      return false;
    }

    const preferences = data?.preferences as UserPreferences | null;
    if (hasCompletePreferences(preferences)) {
      setUserPreferences(preferences);
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
    setUserPreferences(preferences);
    if (user) {
      await supabase
        .from('profiles')
        .update({
          preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
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
          onViewExercise={(exercise) => handleViewChange('exercise', exercise)}
          onNavigate={handleViewChange}
          userId={user?.id || null}
          userPreferences={userPreferences}
          subscriptionPlan={subscriptionPlan}
          onUpgrade={handleUpgradeToPremium}
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

          const { error } = await supabase.from('profiles').update({
            preferences: prefs,
            updated_at: new Date().toISOString(),
          }).eq('id', user.id);

          if (error) {
            setProfileLoadError(error.message);
            return;
          }

          setUserPreferences(prefs);
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
