
export const getLocalHHMM = (date: Date, timezone: string): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(date);
    const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
    const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
    return `${hour}:${minute}`;
  } catch {
    return getLocalHHMM(date, 'UTC');
  }
};

export interface NotificationPreferences {
  push_enabled: boolean;
  timezone?: string;
  quiet_hours_enabled: boolean;
  quiet_start_local: string;
  quiet_end_local: string;
  max_daily_notifications_override: number | null;
}

export interface NotificationPolicy {
  max_daily_notifications_free: number;
  max_daily_notifications_premium: number;
  ignored_backoff_threshold: number;
  ignored_backoff_daily_cap: number;
}

export interface PlanDecisionInput {
  nowLocalHHMM: string;
  isPremium: boolean;
  todaySentCount: number;
  consecutiveIgnored: number;
  preferences: NotificationPreferences;
  policy: NotificationPolicy;
}

export interface PlanDecision {
  send_now: boolean;
  reason: string;
  nudge_type: 'routine' | 'smart_timing' | 'streak_rescue' | null;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
};

const isInQuietHours = (nowMinutes: number, start: string, end: string) => {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  if (startMinutes === endMinutes) {
    return false;
  }

  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }

  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
};

export const computeNotificationPlanDecision = ({
  nowLocalHHMM,
  isPremium,
  todaySentCount,
  consecutiveIgnored,
  preferences,
  policy,
}: PlanDecisionInput): PlanDecision => {
  if (!preferences.push_enabled) {
    return { send_now: false, reason: 'push_disabled', nudge_type: null };
  }

  if (
    preferences.quiet_hours_enabled &&
    isInQuietHours(toMinutes(nowLocalHHMM), preferences.quiet_start_local, preferences.quiet_end_local)
  ) {
    return { send_now: false, reason: 'quiet_hours', nudge_type: null };
  }

  const configuredCap =
    preferences.max_daily_notifications_override ??
    (isPremium ? policy.max_daily_notifications_premium : policy.max_daily_notifications_free);

  const effectiveCap =
    consecutiveIgnored >= policy.ignored_backoff_threshold
      ? Math.min(configuredCap, policy.ignored_backoff_daily_cap)
      : configuredCap;

  if (todaySentCount >= effectiveCap) {
    return { send_now: false, reason: 'daily_cap_reached', nudge_type: null };
  }

  return {
    send_now: true,
    reason: isPremium ? 'eligible_premium' : 'eligible_free',
    nudge_type: isPremium ? 'smart_timing' : 'routine',
  };
};
