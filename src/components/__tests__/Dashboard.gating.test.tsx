import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from '../Dashboard';

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

const invokeMock = vi.fn().mockResolvedValue({
  data: { allowed: false, remaining: 0, limit: 3 },
  error: null,
});

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
      eq: vi.fn().mockResolvedValue({ data: [exercise], error: null }),
    };
  }

  if (table === 'exercise_views') {
    const chain: { select: () => typeof chain; eq: (col: string) => typeof chain | Promise<{ count: number; error: null }> } = {
      select: () => chain,
      eq: (col: string) => {
        if (col === 'day_key') {
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
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: fromMock,
    functions: { invoke: invokeMock },
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
  it('prompts upgrade when edge denies a view', async () => {
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

    const card = await screen.findByRole('button', { name: /Test Snack/i });
    fireEvent.click(card);

    await waitFor(() => expect(invokeMock).toHaveBeenCalled());
    expect(onUpgrade).toHaveBeenCalled();
    expect(onViewExercise).not.toHaveBeenCalled();
  });
});
