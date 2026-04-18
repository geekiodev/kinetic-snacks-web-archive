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
  /** 'plan'  — get today's plan, creating slots if needed (default)
   *  'swap'  — swap the exercise on an existing slot              */
  action?: 'plan' | 'swap';
  /** Required for action='swap': the slot id to swap. */
  swap_slot_id?: string;
  /** Candidate exercise IDs (client has already filtered by preferences). */
  candidate_exercise_ids?: string[];
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
      .select('min_minutes_between_snacks_free,min_minutes_between_snacks_premium')
      .eq('id', 'global')
      .maybeSingle(),
  ]);

  if (slotError) return jsonResponse(500, { error: slotError.message });

  const slots       = (slotRows ?? []) as SlotRow[];
  const slotLimit   = entitlements.daily_snack_slots;
  const swapLimit   = entitlements.daily_swap_slots;
  const timezone    = (prefRow as { timezone?: string } | null)?.timezone ?? 'UTC';
  const reminderWindow = (prefRow as { reminder_window?: string } | null)?.reminder_window ?? 'anytime';
  const isPremium   = entitlements.can_use_space_analysis;

  const minGapMinutes = isPremium
    ? ((policyRow as { min_minutes_between_snacks_premium?: number } | null)?.min_minutes_between_snacks_premium ?? 60)
    : ((policyRow as { min_minutes_between_snacks_free?: number } | null)?.min_minutes_between_snacks_free ?? 90);

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

    // Pick any candidate that isn't the current exercise.
    const available = candidateIds.filter((id) => id !== targetSlot.exercise_id);
    if (available.length === 0) {
      return jsonResponse(200, {
        allowed: false,
        reason: 'no_alternative_candidates',
        swap_limit: swapLimit,
        remaining_swaps: getRemaining(swapLimit, swapsUsed),
      });
    }

    const newExerciseId = available[0];
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

  // ── PLAN action (default) ─────────────────────────────────────────────────
  // Determine how many more slots we need to plan for today.
  // For premium (slotLimit = null) we plan one slot at a time on demand
  // rather than pre-planning an unknown number.
  const effectiveSlotLimit = slotLimit ?? (slots.length + 1);
  const needed = slotsNeededToday({ slotLimit: effectiveSlotLimit, slotsPlanned: slots.length });

  if (needed > 0 && candidateIds.length === 0) {
    return jsonResponse(400, { error: 'candidate_exercise_ids is required to plan new slots.' });
  }

  let allSlots = [...slots];

  if (needed > 0) {
    const window  = windowFromReminderPreference(reminderWindow);
    const newTimes = planSlots({
      slotsNeeded: needed,
      window,
      minGapMinutes,
      dayKey,
      timezone,
      existingScheduledAts: slots.map((s) => s.scheduled_at ?? '').filter(Boolean),
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
