import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Auth from '../Auth';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      setSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

describe('Auth', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');
    Object.assign(import.meta.env, {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-key',
    });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })) as unknown as typeof fetch);
  });

  it('shows validation errors when fields are empty', async () => {
    render(<Auth onAuthSuccess={vi.fn()} />);
    const submit = screen
      .getAllByRole('button', { name: /sign in/i })
      .find((button) => button.getAttribute('type') === 'submit');
    if (!submit) {
      throw new Error('Submit button not found');
    }
    await userEvent.click(submit);

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
  });

  it('calls onAuthSuccess when session is available', async () => {
    const onAuthSuccess = vi.fn();
    const sessionUser = {
      id: 'user-1',
      email: 'user@example.com',
      user_metadata: { name: 'User' },
    };

    const supabaseMock = supabase as unknown as {
      auth: {
        getSession: ReturnType<typeof vi.fn>;
        signInWithPassword: ReturnType<typeof vi.fn>;
      };
    };

    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: sessionUser } },
    });
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { session: { user: sessionUser }, user: sessionUser },
      error: null,
    });

    render(<Auth onAuthSuccess={onAuthSuccess} />);

    await userEvent.type(screen.getByLabelText('Email Address'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');

    const submit = screen
      .getAllByRole('button', { name: /sign in/i })
      .find((button) => button.getAttribute('type') === 'submit');
    if (!submit) {
      throw new Error('Submit button not found');
    }
    await userEvent.click(submit);

    await waitFor(() => {
      expect(onAuthSuccess).toHaveBeenCalledWith({
        id: 'user-1',
        name: 'User',
        email: 'user@example.com',
      });
    }, { timeout: 5000 });
  });

  it('recovers from timeout when a session becomes available', async () => {
    const onAuthSuccess = vi.fn();
    const sessionUser = {
      id: 'user-2',
      email: 'timeout@example.com',
      user_metadata: { name: 'Timeout User' },
    };

    const supabaseMock = supabase as unknown as {
      auth: {
        getSession: ReturnType<typeof vi.fn>;
        signInWithPassword: ReturnType<typeof vi.fn>;
      };
    };

    supabaseMock.auth.signInWithPassword.mockRejectedValue(
      new Error('Auth request timed out. Check your Supabase connection.')
    );
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: sessionUser } },
    });

    render(<Auth onAuthSuccess={onAuthSuccess} />);

    await userEvent.type(screen.getByLabelText('Email Address'), 'timeout@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');

    const submit = screen
      .getAllByRole('button', { name: /sign in/i })
      .find((button) => button.getAttribute('type') === 'submit');
    if (!submit) {
      throw new Error('Submit button not found');
    }

    await userEvent.click(submit);

    await waitFor(() => {
      expect(onAuthSuccess).toHaveBeenCalledWith({
        id: 'user-2',
        name: 'Timeout User',
        email: 'timeout@example.com',
      });
    }, { timeout: 6000 });
  });

});
