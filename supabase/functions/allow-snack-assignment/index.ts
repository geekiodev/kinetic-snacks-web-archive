import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getEntitlements } from '../_shared/entitlements.ts';
import { planSlots, windowFromReminderPreference, formatLocalTime } from '../_shared/schedulingLogic.ts';
import { slotsNeededToday, canUseSwap, getRemaining } from './usageLogic.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

type Payload = {
  day_key?: string;
  /** IANA timezone string from the client (e.g. 'America/New_York').
   *  When present, takes precedence over the value stored in notification_preferences. */
  timezone?: string;
  action?: 'plan' | 'swap' | 'snooze' | 'skip';
  /** Required for action='swap': the slot id to swap. */
  swap_slot_id?: string;
  /** Required for action='snooze': the slot id to push forward. */
  snooze_slot_id?: string;
  /** Minutes to push the slot forward. Defaults to 30. */
  snooze_minutes?: number;
  /** Required for action='skip': the slot id to skip. */
  skip_slot_id?: string;
  /** Candidate exercise IDs (client has already filtered by preferences). */
  candidate_exercise_ids?: string[];
  /** Dev-only: schedule all slots within the next few minutes for easy testing. */
  dev_mode?: boolean;
};

type SlotRow = {
  id: string;
  assignment_index: number;
  exercise_id: string;
  source: string;
  status: string;
  scheduled_at: string | null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const supabaseUrl        = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey    = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: 'Missing Supabase environment configuration.' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return jsonResponse(401, { error: 'Missing Authorization header.' });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return jsonResponse(401, { error: 'Unauthorized', details: authError?.message ?? 'User not found' });
  }
  const userId = authData.user.id;

  const body = (await req.json().catch(() => ({}))) as Payload;
  const now    = new Date();
  // day_key should always be sent by the client in their local timezone.
  // Fallback uses UTC which may be wrong — client should always supply this.
  const dayKey = body.day_key ?? now.toISOString().slice(0, 10);
  const action = body.action ?? 'plan';
  const candidateIds = (body.candidate_exercise_ids ?? []).filter(Boolean);

  // ── Fetch everything we need in parallel ──────────────────────────────────
  const [
    { entitlements },
    { data: slotRows, error: slotError },
    { data: prefRow },
    { data: policyRow },
  ] = await Promise.all([
    getEntitlements(supabase, userId),
    supabase
      .from('daily_snack_assignments')
      .select('id,assignment_index,exercise_id,source,status,scheduled_at')
      .eq('user_id', userId)
      .eq('day_key', dayKey)
      .order('assignment_index', { ascending: true }),
    supabase
      .from('notification_preferences')
      .select('timezone,reminder_window')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('notification_policy_config')
      .select('min_minutes_between_snacks_free,min_minutes_between_snacks_premium,premium_daily_snack_goal')
      .eq('id', 'global')
      .maybeSingle(),
  ]);

  if (slotError) return jsonResponse(500, { error: slotError.message });

  const slots       = (slotRows ?? []) as SlotRow[];
  const slotLimit   = entitlements.daily_snack_slots;
  const swapLimit   = entitlements.daily_swap_slots;
  // Prefer the client-supplied timezone (already in local context) over the DB-stored value,
  // which may have been set to 'UTC' during onboarding before the user's real TZ was known.
  const timezone    = body.timezone ?? (prefRow as { timezone?: string } | null)?.timezone ?? 'UTC';
  const reminderWindow = (prefRow as { reminder_window?: string } | null)?.reminder_window ?? 'anytime';
  const isPremium   = entitlements.can_use_space_analysis;

  const minGapMinutes = isPremium
    ? ((policyRow as { min_minutes_between_snacks_premium?: number } | null)?.min_minutes_between_snacks_premium ?? 60)
    : ((policyRow as { min_minutes_between_snacks_free?: number } | null)?.min_minutes_between_snacks_free ?? 90);

  const premiumDailyGoal =
    (policyRow as { premium_daily_snack_goal?: number } | null)?.premium_daily_snack_goal ?? 5;

  const swapsUsed = slots.filter((s) => s.source === 'manual_swap').length;

  // ── SWAP action ───────────────────────────────────────────────────────────
  if (action === 'swap') {
    if (!body.swap_slot_id) {
      return jsonResponse(400, { error: 'swap_slot_id is required for action=swap.' });
    }
    if (candidateIds.length === 0) {
      return jsonResponse(400, { error: 'candidate_exercise_ids is required for action=swap.' });
    }
    if (!canUseSwap({ swapLimit, swapsUsed })) {
      return jsonResponse(200, {
        allowed: false,
        reason: 'swap_limit_reached',
        swap_limit: swapLimit,
        remaining_swaps: 0,
      });
    }

    const targetSlot = slots.find((s) => s.id === body.swap_slot_id);
    if (!targetSlot) {
      return jsonResponse(404, { error: 'Slot not found.' });
    }

    // Exclude the current exercise AND any exercise already assigned to another
    // slot today (pending, active, notified, completed) to avoid duplicates.
    const usedInOtherSlots = new Set(
      slots
        .filter((s) => s.id !== body.swap_slot_id && s.status !== 'skipped' && s.status !== 'cancelled')
        .map((s) => s.exercise_id),
    );
    let available = candidateIds.filter(
      (id) => id !== targetSlot.exercise_id && !usedInOtherSlots.has(id),
    );
    // If strict exclusion leaves nothing, relax to just avoiding the current exercise.
    if (available.length === 0) {
      available = candidateIds.filter((id) => id !== targetSlot.exercise_id);
    }
    if (available.length === 0) {
      return jsonResponse(200, {
        allowed: false,
        reason: 'no_alternative_candidates',
        swap_limit: swapLimit,
        remaining_swaps: getRemaining(swapLimit, swapsUsed),
      });
    }

    // Pick randomly so repeated swaps don't cycle through the same sequence.
    const newExerciseId = available[Math.floor(Math.random() * available.length)];
    const { error: updateError } = await supabase
      .from('daily_snack_assignments')
      .update({ exercise_id: newExerciseId, source: 'manual_swap' })
      .eq('id', body.swap_slot_id)
      .eq('user_id', userId);

    if (updateError) return jsonResponse(500, { error: updateError.message });

    const updatedSwapsUsed = swapsUsed + 1;
    return jsonResponse(200, {
      allowed: true,
      slot_id: body.swap_slot_id,
      assigned_exercise_id: newExerciseId,
      swap_limit: swapLimit,
      remaining_swaps: getRemaining(swapLimit, updatedSwapsUsed),
    });
  }

  // ── SNOOZE action ─────────────────────────────────────────────────────────
  if (action === 'snooze') {
    if (!body.snooze_slot_id) {
      return jsonResponse(400, { error: 'snooze_slot_id is required for action=snooze.' });
    }
    const targetSlot = slots.find((s) => s.id === body.snooze_slot_id);
    if (!targetSlot) return jsonResponse(404, { error: 'Slot not found.' });

    const snoozeMs = (body.snooze_minutes ?? 30) * 60 * 1000;
    const baseTime = new Date(targetSlot.scheduled_at ?? now.toISOString());
    // If the slot is already overdue, snooze from now instead of from the past.
    const snoozeFrom = baseTime < now ? now : baseTime;
    const newAt = new Date(snoozeFrom.getTime() + snoozeMs);

    const { error: updateError } = await supabase
      .from('daily_snack_assignments')
      .update({ scheduled_at: newAt.toISOString(), status: 'pending' })
      .eq('id', body.snooze_slot_id)
      .eq('user_id', userId);

    if (updateError) return jsonResponse(500, { error: updateError.message });

    return jsonResponse(200, {
      slot_id: body.snooze_slot_id,
      scheduled_at: newAt.toISOString(),
      scheduled_at_local: formatLocalTime(newAt.toISOString(), timezone),
    });
  }

  // ── SKIP action ───────────────────────────────────────────────────────────
  if (action === 'skip') {
    if (!body.skip_slot_id) {
      return jsonResponse(400, { error: 'skip_slot_id is required for action=skip.' });
    }

    const { error: updateError } = await supabase
      .from('daily_snack_assignments')
      .update({ status: 'skipped' })
      .eq('id', body.skip_slot_id)
      .eq('user_id', userId);

    if (updateError) return jsonResponse(500, { error: updateError.message });

    // Attempt to schedule a replacement slot later in the day.
    const PREMIUM_DAILY_GOAL = premiumDailyGoal;
    const postSkipSlots = slots.map((s) =>
      s.id === body.skip_slot_id ? { ...s, status: 'skipped' } : s,
    );
    const nonSkippedCount = postSkipSlots.filter(
      (s) => s.status !== 'skipped' && s.status !== 'cancelled',
    ).length;
    const effectiveLimitForSkip = slotLimit ?? PREMIUM_DAILY_GOAL;
    const replacementNeeded = slotsNeededToday({
      slotLimit: effectiveLimitForSkip,
      slotsPlanned: nonSkippedCount,
    });

    let replacementSlot = null;

    if (replacementNeeded > 0 && candidateIds.length > 0) {
      const win = windowFromReminderPreference(reminderWindow);
      const replacementTimes = planSlots({
        slotsNeeded: 1,
        window: win,
        minGapMinutes,
        dayKey,
        timezone,
        existingScheduledAts: postSkipSlots
          .map((s) => s.scheduled_at ?? '')
          .filter(Boolean),
        nowISO: now.toISOString(),
      });

      if (replacementTimes.length > 0) {
        const usedIds = new Set(postSkipSlots.map((s) => s.exercise_id));
        const available = candidateIds.filter((id) => !usedIds.has(id));
        const pool = available.length > 0 ? available : candidateIds;

        const { data: inserted } = await supabase
          .from('daily_snack_assignments')
          .insert({
            user_id:          userId,
            day_key:          dayKey,
            assignment_index: postSkipSlots.length + 1,
            exercise_id:      pool[0],
            source:           'auto',
            status:           'pending',
            scheduled_at:     replacementTimes[0].toISOString(),
          })
          .select('id,assignment_index,exercise_id,source,status,scheduled_at')
          .single();

        if (inserted) {
          replacementSlot = {
            id:                  inserted.id,
            status:              inserted.status,
            exercise_id:         inserted.exercise_id,
            scheduled_at:        inserted.scheduled_at,
            scheduled_at_local:  formatLocalTime(inserted.scheduled_at!, timezone),
            source:              inserted.source,
          };
        }
      }
    }

    return jsonResponse(200, {
      skipped_slot_id: body.skip_slot_id,
      replacement_slot: replacementSlot,
    });
  }

  // ── PLAN action (default) ─────────────────────────────────────────────────
  // For premium users (slotLimit = null) pre-plan PREMIUM_DAILY_GOAL slots
  // upfront rather than one at a time, giving users a full-day movement plan.
  const PREMIUM_DAILY_GOAL = 5;
  const nonSkippedSlots = slots.filter((s) => s.status !== 'skipped' && s.status !== 'cancelled');
  const effectiveSlotLimit = slotLimit ?? PREMIUM_DAILY_GOAL;
  const needed = slotsNeededToday({ slotLimit: effectiveSlotLimit, slotsPlanned: nonSkippedSlots.length });

  if (needed > 0 && candidateIds.length === 0) {
    return jsonResponse(400, { error: 'candidate_exercise_ids is required to plan new slots.' });
  }

  let allSlots = [...slots];

  if (needed > 0) {
    // In dev_mode, compress all slots into the next ~10 minutes for quick testing.
    const devMode = body.dev_mode === true;
    let window = windowFromReminderPreference(reminderWindow);
    let effectiveMinGap = minGapMinutes;

    if (devMode) {
      const nowLocal = now.toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
      const [hh, mm] = nowLocal.split(':').map(Number);
      const startMin = mm + 1;
      const endMin   = startMin + Math.max(needed * 2 + 2, 10);
      const pad = (n: number) => String(n).padStart(2, '0');
      const clampHH = (h: number, m: number) => {
        const totalH = h + Math.floor(m / 60);
        return { h: Math.min(totalH, 23), m: m % 60 };
      };
      const start = clampHH(hh, startMin);
      const end   = clampHH(hh, endMin);
      window = {
        startHHMM: `${pad(start.h)}:${pad(start.m)}`,
        endHHMM:   `${pad(end.h)}:${pad(end.m)}`,
      };
      effectiveMinGap = 1;
    }

    const newTimes = planSlots({
      slotsNeeded: needed,
      window,
      minGapMinutes: effectiveMinGap,
      dayKey,
      timezone,
      existingScheduledAts: nonSkippedSlots.map((s) => s.scheduled_at ?? '').filter(Boolean),
      nowISO: now.toISOString(),
    });

    // Assign exercises round-robin from candidates, avoiding same exercise
    // in consecutive slots.
    const usedIds = new Set(slots.map((s) => s.exercise_id));
    const newSlotRows = newTimes.map((scheduledAt, i) => {
      const available = candidateIds.filter((id) => !usedIds.has(id));
      const pool = available.length > 0 ? available : candidateIds;
      const exerciseId = pool[i % pool.length];
      usedIds.add(exerciseId);
      return {
        user_id: userId,
        day_key: dayKey,
        assignment_index: slots.length + i + 1,
        exercise_id: exerciseId,
        source: 'auto',
        status: 'pending',
        scheduled_at: scheduledAt.toISOString(),
      };
    });

    if (newSlotRows.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('daily_snack_assignments')
        .insert(newSlotRows)
        .select('id,assignment_index,exercise_id,source,status,scheduled_at');

      if (insertError) {
        // Race condition: a concurrent request already inserted slots.
        // Re-read the current state and continue building the response.
        const { data: refetched, error: refetchError } = await supabase
          .from('daily_snack_assignments')
          .select('id,assignment_index,exercise_id,source,status,scheduled_at')
          .eq('user_id', userId)
          .eq('day_key', dayKey)
          .order('assignment_index', { ascending: true });
        if (refetchError) return jsonResponse(500, { error: refetchError.message });
        allSlots = (refetched ?? []) as SlotRow[];
      } else {
        allSlots = [...slots, ...((inserted ?? []) as SlotRow[])];
      }
    }
  }

  // ── Trim excess slots when limit was reduced mid-day ─────────────────────
  // If slots already in the DB exceed the current entitlement (e.g. admin
  // lowered daily_snack_slots from 9 → 3), cancel the surplus pending ones
  // so the user isn't shown a plan that exceeds their allowed quota.
  if (slotLimit !== null && allSlots.length > slotLimit) {
    const finishedCount = allSlots.filter(
      (s) => s.status === 'completed' || s.status === 'active' || s.status === 'notified',
    ).length;
    const pendingBudget = Math.max(0, slotLimit - finishedCount);
    const pendingByTime = allSlots
      .filter((s) => s.status === 'pending')
      .sort((a, b) => new Date(a.scheduled_at ?? '').getTime() - new Date(b.scheduled_at ?? '').getTime());
    const toCancel = pendingByTime.slice(pendingBudget);

    if (toCancel.length > 0) {
      await supabase
        .from('daily_snack_assignments')
        .update({ status: 'cancelled' })
        .in('id', toCancel.map((s) => s.id));
      const cancelledIds = new Set(toCancel.map((s) => s.id));
      allSlots = allSlots.filter((s) => !cancelledIds.has(s.id));
    }
  }

  // ── Build response ────────────────────────────────────────────────────────
  const pendingSlots    = allSlots.filter((s) => s.status === 'pending' && s.scheduled_at);
  const completedSlots  = allSlots.filter((s) => s.status === 'completed');
  const activeSlot      = allSlots.find((s) => s.status === 'active' || s.status === 'notified') ?? null;
  const nextPendingSlot = pendingSlots.sort(
    (a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime()
  )[0] ?? null;

  const slotsPlanned    = allSlots.length;
  const slotsConsumed   = completedSlots.length + (activeSlot ? 1 : 0);

  return jsonResponse(200, {
    slots: allSlots.map((s) => ({
      id: s.id,
      status: s.status,
      exercise_id: s.exercise_id,
      scheduled_at: s.scheduled_at,
      scheduled_at_local: s.scheduled_at
        ? formatLocalTime(s.scheduled_at, timezone)
        : null,
      source: s.source,
    })),
    active_slot: activeSlot
      ? {
          id: activeSlot.id,
          exercise_id: activeSlot.exercise_id,
          scheduled_at: activeSlot.scheduled_at,
        }
      : null,
    next_slot: nextPendingSlot
      ? {
          id: nextPendingSlot.id,
          scheduled_at: nextPendingSlot.scheduled_at,
          scheduled_at_local: formatLocalTime(nextPendingSlot.scheduled_at!, timezone),
        }
      : null,
    slot_limit: slotLimit,
    slots_planned: slotsPlanned,
    slots_consumed: slotsConsumed,
    remaining_slots: getRemaining(slotLimit, slotsConsumed),
    swap_limit: swapLimit,
    remaining_swaps: getRemaining(swapLimit, swapsUsed),
  });
});
