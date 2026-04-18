// Slot scheduling logic for the snack autopilot system.
//
// Given a user's availability window, how many slots they're entitled to,
// and any slots already planned for today, produces a list of UTC Date
// objects at which new snack slots should be delivered.
//
// This module is intentionally pure (no DB calls) so it can be unit-tested
// and used from both allow-snack-assignment and notifications-dispatch.

export interface WindowDefinition {
  startHHMM: string; // "09:00"
  endHHMM: string;   // "17:00"
}

/**
 * Derive a meaningful availability window from a user's reminder_window
 * preference. When calendar integration is added this will be supplemented
 * by real calendar free/busy data.
 */
export function windowFromReminderPreference(pref: string): WindowDefinition {
  switch (pref) {
    case 'morning': return { startHHMM: '08:00', endHHMM: '12:00' };
    case 'midday':  return { startHHMM: '11:00', endHHMM: '14:00' };
    case 'evening': return { startHHMM: '17:00', endHHMM: '20:00' };
    default:        return { startHHMM: '08:00', endHHMM: '20:00' }; // 'anytime'
  }
}

/**
 * Convert a local HH:MM time on a calendar day to a UTC Date.
 *
 * Uses the sv-SE locale trick: toLocaleString('sv-SE') returns an
 * ISO-like "YYYY-MM-DD HH:MM:SS" string in the target timezone, letting
 * us compute the UTC offset without any external library.
 */
export function zonedToUTC(dayKey: string, timeHHMM: string, timezone: string): Date {
  // Treat the time as if it were UTC to get a starting Date.
  const approxUTC = new Date(`${dayKey}T${timeHHMM}:00Z`);

  // Format that UTC instant in the target timezone.
  const localStr = approxUTC.toLocaleString('sv-SE', { timeZone: timezone });
  // localStr looks like "2026-04-18 09:00:00"
  const localAsUTC = new Date(localStr.replace(' ', 'T') + 'Z');

  // The difference tells us the timezone offset at this instant.
  const offsetMs = approxUTC.getTime() - localAsUTC.getTime();
  return new Date(approxUTC.getTime() + offsetMs);
}

export interface PlanSlotsInput {
  /** How many NEW slots to create (not counting existing ones). */
  slotsNeeded: number;
  window: WindowDefinition;
  /** Minimum gap between any two slots (existing or new), in minutes. */
  minGapMinutes: number;
  /** "YYYY-MM-DD" in the user's local timezone. */
  dayKey: string;
  timezone: string;
  /** ISO UTC strings of slots already planned for today. Used to anchor
   *  re-planning so new slots don't overlap existing ones. */
  existingScheduledAts: string[];
  /** ISO UTC string of the current moment. New slots must be at least
   *  SCHEDULE_BUFFER_MINUTES in the future. */
  nowISO: string;
}

const SCHEDULE_BUFFER_MINUTES = 5;

/**
 * Distribute slotsNeeded slots evenly across the user's availability window,
 * respecting the minimum gap and existing scheduled slots.
 *
 * Returns an array of UTC Dates for the new slots (may be shorter than
 * slotsNeeded if the window is too narrow to fit them all).
 */
export function planSlots(input: PlanSlotsInput): Date[] {
  const { slotsNeeded, window: win, minGapMinutes, dayKey, timezone, existingScheduledAts, nowISO } = input;

  if (slotsNeeded <= 0) return [];

  const windowStartUTC = zonedToUTC(dayKey, win.startHHMM, timezone);
  const windowEndUTC   = zonedToUTC(dayKey, win.endHHMM,   timezone);
  const now            = new Date(nowISO);
  const minGapMs       = minGapMinutes * 60 * 1000;
  const bufferMs       = SCHEDULE_BUFFER_MINUTES * 60 * 1000;

  // Slots must be at least SCHEDULE_BUFFER_MINUTES in the future and
  // within the window.
  const earliest = new Date(Math.max(windowStartUTC.getTime(), now.getTime() + bufferMs));
  if (earliest >= windowEndUTC) return [];

  // Find the latest existing slot that falls within today's window so we
  // can anchor new slots after it.
  const existingInWindowMs = existingScheduledAts
    .map((s) => new Date(s).getTime())
    .filter((t) => t >= windowStartUTC.getTime() && t < windowEndUTC.getTime());

  const lastExistingMs = existingInWindowMs.length > 0
    ? Math.max(...existingInWindowMs)
    : null;

  // cursor is where we start placing new slots from.
  const cursor = lastExistingMs !== null
    ? Math.max(earliest.getTime(), lastExistingMs + minGapMs)
    : earliest.getTime();

  if (cursor >= windowEndUTC.getTime()) return [];

  // Spread slotsNeeded points evenly across [cursor, windowEnd).
  // Divide the range into (slotsNeeded + 1) segments and place a slot at
  // the end of each segment except the last, giving equal breathing room
  // before the first slot and after the last.
  const availableMs    = windowEndUTC.getTime() - cursor;
  const idealSpacingMs = availableMs / (slotsNeeded + 1);
  const spacingMs      = Math.max(idealSpacingMs, minGapMs);

  const results: Date[] = [];
  for (let i = 1; i <= slotsNeeded; i++) {
    const t = cursor + spacingMs * i;
    if (t >= windowEndUTC.getTime()) break;
    results.push(new Date(t));
  }

  return results;
}

/**
 * Format a UTC Date as a human-readable local time string ("9:15 AM").
 * Used by the client and the dispatch worker for "Your next snack is at X".
 */
export function formatLocalTime(utcISO: string, timezone: string): string {
  return new Date(utcISO).toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
