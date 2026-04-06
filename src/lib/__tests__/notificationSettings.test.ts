import { describe, expect, it } from 'vitest';
import {
  defaultNotificationSettings,
  normalizeNotificationSettings,
  type NotificationSettings,
} from '../notificationSettings';

describe('notificationSettings', () => {
  it('returns defaults when input is missing', () => {
    expect(normalizeNotificationSettings(undefined)).toEqual(defaultNotificationSettings);
  });

  it('normalizes invalid time strings and unknown reminder window values', () => {
    const normalized = normalizeNotificationSettings({
      pushEnabled: false,
      quietStartLocal: '25:00',
      quietEndLocal: '07:77',
      reminderWindow: 'invalid' as NotificationSettings['reminderWindow'],
      maxDailyNotifications: -4,
    });

    expect(normalized).toEqual({
      pushEnabled: false,
      quietHoursEnabled: true,
      quietStartLocal: '21:30',
      quietEndLocal: '07:00',
      reminderWindow: 'anytime',
      maxDailyNotifications: null,
    });
  });
});
