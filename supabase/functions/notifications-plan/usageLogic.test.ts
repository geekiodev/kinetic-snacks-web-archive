import { describe, expect, it } from 'vitest';
import { computeNotificationPlanDecision, getLocalHHMM } from './usageLogic';

const baseInput = {
  nowLocalHHMM: '10:00',
  isPremium: false,
  todaySentCount: 0,
  consecutiveIgnored: 0,
  preferences: {
    push_enabled: true,
    quiet_hours_enabled: true,
    quiet_start_local: '21:30',
    quiet_end_local: '07:00',
    max_daily_notifications_override: null,
  },
  policy: {
    max_daily_notifications_free: 2,
    max_daily_notifications_premium: 4,
    ignored_backoff_threshold: 3,
    ignored_backoff_daily_cap: 1,
  },
};

describe('computeNotificationPlanDecision', () => {
  it('blocks while in quiet hours', () => {
    const decision = computeNotificationPlanDecision({
      ...baseInput,
      nowLocalHHMM: '22:30',
    });

    expect(decision).toEqual({ send_now: false, reason: 'quiet_hours', nudge_type: null });
  });

  it('applies ignored-user backoff cap', () => {
    const decision = computeNotificationPlanDecision({
      ...baseInput,
      todaySentCount: 1,
      consecutiveIgnored: 3,
    });

    expect(decision).toEqual({ send_now: false, reason: 'daily_cap_reached', nudge_type: null });
  });



  it('converts UTC time to requested timezone HH:mm', () => {
    expect(getLocalHHMM(new Date('2026-04-06T12:00:00.000Z'), 'UTC')).toBe('12:00');
    expect(getLocalHHMM(new Date('2026-04-06T12:00:00.000Z'), 'Asia/Tokyo')).toBe('21:00');
  });

  it('returns premium smart timing nudge type when eligible', () => {
    const decision = computeNotificationPlanDecision({
      ...baseInput,
      isPremium: true,
    });

    expect(decision).toEqual({ send_now: true, reason: 'eligible_premium', nudge_type: 'smart_timing' });
  });
});
