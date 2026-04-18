import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testExercise = {
  id: 'exercise-1',
  title: 'Desk Stretch',
  duration: 5,
  intensity: 'low' as const,
  equipment: [],
  instructions: ['Reach arms overhead'],
  tips: 'Breathe deeply',
  category: 'mobility',
};

const testPreferences = {
  limitations: ['knee'],
  equipment: ['mat'],
  location: ['home'],
  intensityLevel: 'low',
  duration: 5,
};

const mockedState = vi.hoisted(() => ({
  authStateChangeHandler: undefined as
    | ((event: string, session: { user: { id: string; email?: string; user_metadata?: { name?: string } } } | null) => void | Promise<void>)
    | undefined,
  hasProfile: false,
  profileSelectError: null as string | null,
  getSessionMock: vi.fn().mockResolvedValue({ data: { session: null } }),
  setSessionMock: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  profileUpdateMock: vi.fn().mockResolvedValue({ error: null }),
  completionInsertMock: vi.fn().mockResolvedValue({ error: null }),
  signOutMock: vi.fn().mockResolvedValue({ error: null }),
  notificationUpsertMock: vi.fn().mockResolvedValue({ error: null }),
  fromMock: vi.fn(),
}));

mockedState.fromMock.mockImplementation((table: string) => {
  if (table === 'profiles') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockImplementation(async () => {
            if (mockedState.profileSelectError) {
              return { data: null, error: { message: mockedState.profileSelectError } };
            }

            return {
              data: { preferences: mockedState.hasProfile ? testPreferences : null },
              error: null,
            };
          }),
        })),
      })),
      update: vi.fn(() => ({ eq: mockedState.profileUpdateMock })),
    };
  }

  if (table === 'exercise_completions') {
    return {
      insert: mockedState.completionInsertMock,
    };
  }

  if (table === 'notification_preferences') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
      })),
      upsert: mockedState.notificationUpsertMock,
    };
  }

  return {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  };
});

vi.mock('../components/Landing', () => ({
  default: ({ onGetStarted }: { onGetStarted: () => void }) => (
    <section><h1>Landing Screen</h1><button onClick={onGetStarted}>Get Started</button></section>
  ),
}));
vi.mock('../components/Auth', () => ({
  default: ({ onAuthSuccess }: { onAuthSuccess: (user: { id: string; name: string; email: string }) => void }) => (
    <section><h1>Auth Screen</h1><button onClick={() => onAuthSuccess({ id: 'user-1', name: 'Ada', email: 'ada@example.com' })}>Complete Sign In</button></section>
  ),
}));
vi.mock('../components/Onboarding', () => ({
  default: ({ onComplete }: { onComplete: (preferences: typeof testPreferences) => void }) => (
    <section><h1>Onboarding Screen</h1><button onClick={() => onComplete(testPreferences)}>Finish Onboarding</button></section>
  ),
}));
vi.mock('../components/Pricing', () => ({
  default: ({ onSelectPlan, onSkip }: { onSelectPlan: (plan: 'free' | 'premium') => void; onSkip?: () => void }) => (
    <section><h1>Pricing Screen</h1><button onClick={() => onSelectPlan('free')}>Choose Free</button><button onClick={() => onSelectPlan('premium')}>Choose Premium</button>{onSkip && <button onClick={onSkip}>Skip Pricing</button>}</section>
  ),
}));
vi.mock('../components/Dashboard', () => ({
  default: ({ onNavigate, onViewExercise, onUpgrade }: { onNavigate: (view: 'settings' | 'space-analysis') => void; onViewExercise: (exercise: typeof testExercise) => void; onUpgrade: () => void }) => (
    <section><h1>Dashboard Screen</h1><button onClick={() => onViewExercise(testExercise)}>Open Exercise</button><button onClick={() => onNavigate('settings')}>Open Settings</button><button onClick={() => onNavigate('space-analysis')}>Open Space Analysis</button><button onClick={onUpgrade}>Upgrade Plan</button></section>
  ),
}));
vi.mock('../components/ExerciseDetail', () => ({
  default: ({ exercise, onBack, onComplete }: { exercise: typeof testExercise; onBack: () => void; onComplete: (exercise: typeof testExercise) => Promise<void> }) => (
    <section><h1>Exercise Detail Screen</h1><p>{exercise.title}</p><button onClick={() => onComplete(exercise)}>Complete Exercise</button><button onClick={onBack}>Back To Dashboard</button></section>
  ),
}));
vi.mock('../components/Settings', () => ({
  default: ({ onSave, onBack, onSignOut }: { onSave: (preferences: typeof testPreferences) => Promise<void>; onBack: () => void; onSignOut: () => Promise<void> }) => (
    <section><h1>Settings Screen</h1><button onClick={() => onSave(testPreferences)}>Save Settings</button><button onClick={onBack}>Back Without Saving</button><button onClick={() => onSignOut()}>Sign Out</button></section>
  ),
}));
vi.mock('../components/SpaceAnalysis', () => ({
  default: ({ isPremium, onBack, onUpgrade }: { isPremium: boolean; onBack: () => void; onUpgrade: () => void }) => (
    <section><h1>Space Analysis Screen</h1><p>{isPremium ? 'Premium Enabled' : 'Free Tier'}</p><button onClick={onUpgrade}>Upgrade in Space Analysis</button><button onClick={onBack}>Back to Dashboard</button></section>
  ),
}));
vi.mock('../components/PaymentModal', () => ({
  default: ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => (
    <section><h1>Payment Modal</h1><button onClick={onSuccess}>Finish Payment</button><button onClick={onClose}>Close Payment</button></section>
  ),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mockedState.fromMock,
    auth: {
      storageKey: 'sb-local-auth-token',
      getSession: mockedState.getSessionMock,
      setSession: mockedState.setSessionMock,
      signOut: mockedState.signOutMock,
      onAuthStateChange: vi.fn((cb) => {
        mockedState.authStateChangeHandler = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  },
}));

import App from '../App';

describe('App end-to-end orchestration', () => {
  beforeEach(() => {
    mockedState.hasProfile = false;
    mockedState.profileSelectError = null;
    mockedState.authStateChangeHandler = undefined;
    mockedState.getSessionMock.mockClear();
    mockedState.setSessionMock.mockClear();
    mockedState.fromMock.mockClear();
    mockedState.completionInsertMock.mockClear();
    mockedState.profileUpdateMock.mockClear();
    mockedState.signOutMock.mockClear();
    mockedState.notificationUpsertMock.mockClear();
    window.localStorage.clear();
  });

  it('runs a new-user flow across core functionality and UI views', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('Landing Screen')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Get Started' }));
    await user.click(screen.getByRole('button', { name: 'Complete Sign In' }));
    await screen.findByText('Onboarding Screen');
    expect(screen.queryByText('Unable to load your profile. Please check your Supabase settings and try again.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Finish Onboarding' }));
    await screen.findByText('Pricing Screen');
    await user.click(screen.getByRole('button', { name: 'Choose Free' }));
    await screen.findByText('Dashboard Screen');

    await user.click(screen.getByRole('button', { name: 'Open Exercise' }));
    await screen.findByText('Exercise Detail Screen');
    await user.click(screen.getByRole('button', { name: 'Complete Exercise' }));

    await waitFor(() => {
      expect(mockedState.completionInsertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', exercise_id: 'exercise-1' }));
    });

    await user.click(screen.getByRole('button', { name: 'Back To Dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Open Settings' }));
    await screen.findByText('Settings Screen');

    await user.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(mockedState.profileUpdateMock).toHaveBeenCalledWith('id', 'user-1'));
    await waitFor(() => expect(mockedState.notificationUpsertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1' })));
    await screen.findByText('Dashboard Screen');

    await user.click(screen.getByRole('button', { name: 'Open Settings' }));
    await user.click(screen.getByRole('button', { name: 'Sign Out' }));
    await waitFor(() => expect(mockedState.signOutMock).toHaveBeenCalledTimes(1));
    await screen.findByText('Landing Screen');
  });

  it('handles existing user session, premium upgrade and premium UI state', async () => {
    mockedState.hasProfile = true;
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => expect(mockedState.authStateChangeHandler).toBeTypeOf('function'));
    await act(async () => {
      await mockedState.authStateChangeHandler?.('INITIAL_SESSION', {
        user: { id: 'user-99', email: 'premium@example.com', user_metadata: { name: 'Premium User' } },
      });
    });

    await screen.findByText('Dashboard Screen');
    await user.click(screen.getByRole('button', { name: 'Upgrade Plan' }));
    await screen.findByText('Payment Modal');
    await user.click(screen.getByRole('button', { name: 'Finish Payment' }));
    await user.click(screen.getByRole('button', { name: 'Open Space Analysis' }));
    expect(await screen.findByText('Premium Enabled')).toBeInTheDocument();
  });

  it('hydrates from local storage and keeps free plan when payment modal closes', async () => {
    mockedState.hasProfile = true;
    const user = userEvent.setup();
    window.localStorage.setItem('sb-local-auth-token', JSON.stringify({
      access_token: 'stored-access',
      refresh_token: 'stored-refresh',
      user: { id: 'user-2', email: 'free@example.com', user_metadata: { name: 'Free User' } },
    }));

    render(<App />);

    await screen.findByText('Dashboard Screen');
    await waitFor(() => {
      expect(mockedState.setSessionMock).toHaveBeenCalledWith({
        access_token: 'stored-access',
        refresh_token: 'stored-refresh',
      });
    });

    await user.click(screen.getByRole('button', { name: 'Upgrade Plan' }));
    await screen.findByText('Payment Modal');
    await user.click(screen.getByRole('button', { name: 'Close Payment' }));
    await screen.findByText('Dashboard Screen');

    await user.click(screen.getByRole('button', { name: 'Open Space Analysis' }));
    expect(await screen.findByText('Free Tier')).toBeInTheDocument();
  });

  it('surfaces profile-load errors in the UI', async () => {
    mockedState.profileSelectError = 'Could not load profile';
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Get Started' }));
    await user.click(screen.getByRole('button', { name: 'Complete Sign In' }));

    expect(await screen.findByText('Unable to load your profile. Please check your Supabase settings and try again.')).toBeInTheDocument();
  });
});
