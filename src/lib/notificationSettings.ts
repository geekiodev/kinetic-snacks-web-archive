export type ReminderWindow = 'anytime' | 'morning' | 'midday' | 'evening';

export interface NotificationSettings {
  pushEnabled: boolean;
  quietHoursEnabled: boolean;
  quietStartLocal: string;
  quietEndLocal: string;
  reminderWindow: ReminderWindow;
  maxDailyNotifications: number | null;
}

export const defaultNotificationSettings: NotificationSettings = {
  pushEnabled: true,
  quietHoursEnabled: true,
  quietStartLocal: '21:30',
  quietEndLocal: '07:00',
  reminderWindow: 'anytime',
  maxDailyNotifications: null,
};

export const normalizeNotificationSettings = (
  input: Partial<NotificationSettings> | null | undefined,
): NotificationSettings => {
  if (!input) {
    return { ...defaultNotificationSettings };
  }

  const asTime = (value: string | undefined, fallback: string) => {
    if (!value) return fallback;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value) ? value : fallback;
  };

  const asReminderWindow = (value: ReminderWindow | undefined): ReminderWindow => {
    if (value === 'morning' || value === 'midday' || value === 'evening' || value === 'anytime') {
      return value;
    }
    return 'anytime';
  };

  return {
    pushEnabled: input.pushEnabled ?? defaultNotificationSettings.pushEnabled,
    quietHoursEnabled: input.quietHoursEnabled ?? defaultNotificationSettings.quietHoursEnabled,
    quietStartLocal: asTime(input.quietStartLocal, defaultNotificationSettings.quietStartLocal),
    quietEndLocal: asTime(input.quietEndLocal, defaultNotificationSettings.quietEndLocal),
    reminderWindow: asReminderWindow(input.reminderWindow),
    maxDailyNotifications:
      typeof input.maxDailyNotifications === 'number' && input.maxDailyNotifications >= 0
        ? input.maxDailyNotifications
        : null,
  };
};
