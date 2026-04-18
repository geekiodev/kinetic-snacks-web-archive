import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Onboarding from '../Onboarding';

describe('Onboarding notifications setup', () => {
  it('collects notification preferences on the final step and returns them in payload', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    render(<Onboarding onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    expect(screen.getByText(/Set your proactive reminders/i)).toBeInTheDocument();

    const quietStart = screen.getByLabelText(/Quiet starts/i);
    const quietEnd = screen.getByLabelText(/Quiet ends/i);
    const reminderWindow = screen.getByLabelText(/Preferred reminder window/i);

    fireEvent.change(quietStart, { target: { value: '22:00' } });
    fireEvent.change(quietEnd, { target: { value: '06:30' } });
    await user.selectOptions(reminderWindow, 'evening');

    await user.click(screen.getByRole('button', { name: /Start My Journey/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const submitted = onComplete.mock.calls[0]?.[0];
    expect(submitted.notificationSettings).toMatchObject({
      quietStartLocal: '22:00',
      quietEndLocal: '06:30',
      reminderWindow: 'evening',
    });
  });
});
