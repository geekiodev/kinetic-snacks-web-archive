import { useState } from 'react';
import Landing from './components/Landing';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import ExerciseDetail from './components/ExerciseDetail';
import Settings from './components/Settings';
import SpaceAnalysis from './components/SpaceAnalysis';
import Auth from './components/Auth';
import Pricing from './components/Pricing';
import PaymentModal from './components/PaymentModal';

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
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    limitations: [],
    equipment: [],
    location: [],
    intensityLevel: 'low',
    duration: 5,
  });

  const handleViewChange = (view: View, exercise?: Exercise) => {
    setCurrentView(view);
    if (exercise) {
      setSelectedExercise(exercise);
    }
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setCurrentView('onboarding');
  };

  const handleOnboardingComplete = (preferences: UserPreferences) => {
    setUserPreferences(preferences);
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

  const handleUpgradeToPremium = () => {
    setShowPaymentModal(true);
  };

  const handleSignOut = () => {
    setUser(null);
    setSubscriptionPlan('free');
    setCurrentView('landing');
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
          userPreferences={userPreferences}
          subscriptionPlan={subscriptionPlan}
          onUpgrade={handleUpgradeToPremium}
        />
      )}

      {currentView === 'exercise' && selectedExercise && (
        <ExerciseDetail
          exercise={selectedExercise}
          onBack={() => setCurrentView('dashboard')}
        />
      )}

      {currentView === 'settings' && (
        <Settings
          preferences={userPreferences}
          user={user}
          onSave={(prefs) => {
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
