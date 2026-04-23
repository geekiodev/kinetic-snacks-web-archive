import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from '../Dashboard';

const mockedState = vi.hoisted(() => {
  const exercise = {
    id: 'ex-1',
    title: 'Test Snack',
    duration: 5,
    intensity: 'low' as const,
    equipment: [],
    instructions: ['Step 1'],
    tips: 'Stay smooth.',
    category: 'mobility',
  };
  const backupExercise = {
    ...exercise,
    id: 'ex-2',
    title: 'Backup Snack',
  };

  let swapUsed = false;

  const invokeMock = vi.fn().mockImplementation(
    async (fnName: string, payload?: { body?: { action?: string } }) => {
      if (fnName === 'notifications-plan') {
        return {
          data: { send_now: false, reason: 'quiet_hours', nudge_type: null },
          error: null,
        };
      }

      if (fnName === 'allow-snack-assignment') {
        const action = payload?.body?.action ?? 'plan';

        if (action === 'plan') {
          return {
            data: {
              slots: [{
                id: 'slot-1',
                status: 'notified',
                exercise_id: exercise.id,
                scheduled_at: new Date().toISOString(),
                scheduled_at_local: '9:00 AM',
                source: 'auto',
              }],
              active_slot: { id: 'slot-1', exercise_id: exercise.id, scheduled_at: new Date().toISOString() },
              next_slot: null,
              slot_limit: 3,
              slots_planned: 1,
              slots_consumed: 0,
              remaining_slots: 3,
              swap_limit: 1,
              remaining_swaps: swapUsed ? 0 : 1,
            },
            error: null,
          };
        }

        if (action === 'swap') {
          if (!swapUsed) {
            swapUsed = true;
            return {
              data: {
                allowed: true,
                slot_id: 'slot-1',
                assigned_exercise_id: backupExercise.id,
                swap_limit: 1,
                remaining_swaps: 0,
              },
              error: null,
            };
          }
          return {
            data: {
              allowed: false,
              reason: 'swap_limit_reached',
              swap_limit: 1,
              remaining_swaps: 0,
            },
            error: null,
          };
        }
      }

      return {
        data: { allowed: false, remaining: 0, limit: 3 },
        error: null,
      };
    },
  );

  const fromMock = vi.fn((table: string) => {
    if (table === 'exercise_completions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }

    if (table === 'exercises') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [exercise, backupExercise], error: null }),
      };
    }

    return {
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
  });

  return { exercise, backupExercise, invokeMock, fromMock };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: mockedState.fromMock,
    functions: { invoke: mockedState.invokeMock },
    auth: {
      storageKey: 'sb-local-auth-token',
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } }),
      setSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null }),
    },
  },
}));

vi.mock('../../lib/exerciseValidation', () => ({
  loadLimitationRules: vi.fn().mockResolvedValue([]),
  validateExerciseCandidate: vi.fn().mockReturnValue({ valid: true }),
}));

vi.mock('../../lib/exerciseGenerator', () => ({
  generateExercises: vi.fn().mockResolvedValue([]),
  rankExercises: vi.fn(({ exercises }) => exercises),
}));

describe('Dashboard free-tier gating', () => {
  it('lets users open auto-assigned snack without consuming view checks and enforces one free manual swap', async () => {
    const onUpgrade = vi.fn();
    const onViewExercise = vi.fn();

    render(
      <Dashboard
        onViewExercise={onViewExercise}
        onNavigate={vi.fn()}
        userId="user-1"
        userPreferences={{
          limitations: [],
          equipment: [],
          location: ['home'],
          intensityLevel: 'low',
          duration: 5,
        }}
        subscriptionPlan="free"
        onUpgrade={onUpgrade}
      />,
    );

    // Nudge status from dry-run
    expect(await screen.findByText(/Quiet hours are active/i)).toBeInTheDocument();
    expect(mockedState.invokeMock).toHaveBeenCalledWith('notifications-plan', expect.objectContaining({
      body: expect.objectContaining({ dry_run: true }),
    }));

    // Exercise card is rendered and clickable without triggering upgrade
    const card = await screen.findByRole('button', { name: /Test Snack/i });
    fireEvent.click(card);
    expect(onUpgrade).not.toHaveBeenCalled();
    expect(onViewExercise).toHaveBeenCalledWith(expect.objectContaining({ id: 'ex-1' }), expect.any(String));

    // Swap button shows remaining count and performs swap
    const swapButton = screen.getByRole('button', { name: /Swap/i });
    fireEvent.click(swapButton);
    await waitFor(() => {
      expect(screen.getByText(/Backup Snack/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/0 left/i)).toBeInTheDocument();

    // Second swap attempt is blocked
    fireEvent.click(screen.getByRole('button', { name: /Swap/i }));
    await waitFor(() => {
      expect(screen.getByText(/used your free daily swap/i)).toBeInTheDocument();
    });
  });
});
