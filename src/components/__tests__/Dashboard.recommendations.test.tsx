import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../Dashboard';
import { generateExercises, rankExercises } from '../../lib/exerciseGenerator';

const mockedState = vi.hoisted(() => ({
  exerciseRows: [] as Array<Record<string, unknown>>,
  generatedExercise: {
    id: 'generated-1',
    title: 'Generated Office Reset',
    duration: 5,
    intensity: 'low' as const,
    equipment: ['None / Bodyweight Only'],
    instructions: ['Step 1'],
    tips: 'Generated fallback for tight constraints.',
    category: 'Mobility',
    fitReasons: ['Matches your 5-minute target', 'Low-sweat and work-friendly'],
  },
  fromMock: vi.fn((table: string) => {
    if (table === 'exercise_completions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({
          data: [
            {
              exercise_id: 'approved-1',
              completed_at: '2026-03-19T10:00:00.000Z',
              duration_minutes: 5,
            },
          ],
          error: null,
        }),
      };
    }

    if (table === 'exercises') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockedState.exerciseRows, error: null }),
      };
    }

    if (table === 'exercise_views') {
      const chain: { select: () => typeof chain; eq: (column: string) => typeof chain | Promise<{ count: number; error: null }> } = {
        select: () => chain,
        eq: (column: string) => {
          if (column === 'day_key') {
            return Promise.resolve({ count: 0, error: null });
          }
          return chain;
        },
      };
      return chain;
    }

    return {
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
  }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: mockedState.fromMock,
    auth: {
      storageKey: 'sb-local-auth-token',
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } }),
      setSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null }),
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('../../lib/exerciseValidation', () => ({
  loadLimitationRules: vi.fn().mockResolvedValue({}),
  validateExerciseCandidate: vi.fn().mockReturnValue({ valid: true }),
}));

vi.mock('../../lib/exerciseGenerator', async () => {
  const actual = await vi.importActual<typeof import('../../lib/exerciseGenerator')>('../../lib/exerciseGenerator');
  return {
    ...actual,
    generateExercises: vi.fn().mockResolvedValue([mockedState.generatedExercise]),
    rankExercises: vi.fn(({ exercises }) => exercises),
  };
});

describe('Dashboard recommendations', () => {
  beforeEach(() => {
    mockedState.exerciseRows = [
      {
        id: 'approved-1',
        title: 'Approved Mobility',
        duration_minutes: 5,
        intensity: 'low',
        equipment: [],
        instructions: ['Step 1'],
        tips: 'Already completed recently.',
        category: 'Mobility',
        variation_key: 'approved-mobility',
        review_status: 'approved',
      },
      {
        id: 'pending-1',
        title: 'Pending Review Exercise',
        duration_minutes: 5,
        intensity: 'low',
        equipment: [],
        instructions: ['Step 1'],
        tips: 'Should never render until approved.',
        category: 'Mobility',
        review_status: 'pending',
      },
    ];
  });

  it('ignores non-approved exercise rows and renders generated fallback exercises with fit-reason badges', async () => {
    render(
      <Dashboard
        onViewExercise={vi.fn()}
        onNavigate={vi.fn()}
        userId="user-1"
        userPreferences={{
          limitations: [],
          equipment: [],
          location: ['Workplace'],
          intensityLevel: 'low',
          duration: 5,
        }}
        subscriptionPlan="premium"
        onUpgrade={vi.fn()}
      />,
    );

    expect(screen.queryByText('Pending Review Exercise')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Generated Office Reset/i })).toBeInTheDocument();
    expect(screen.getByText('Matches your 5-minute target')).toBeInTheDocument();
    expect(screen.getByText('Low-sweat and work-friendly')).toBeInTheDocument();

    await waitFor(() => {
      expect(rankExercises).toHaveBeenCalledWith(
        expect.objectContaining({
          history: {
            recentExerciseIds: ['approved-1'],
            recentVariationKeys: ['approved-mobility'],
            categoryCounts: { Mobility: 1 },
          },
        }),
      );
    });
    expect(generateExercises).toHaveBeenCalledWith(
      expect.objectContaining({
        history: {
          recentExerciseIds: ['approved-1'],
          recentVariationKeys: ['approved-mobility'],
          categoryCounts: { Mobility: 1 },
        },
      }),
    );
  });
});
