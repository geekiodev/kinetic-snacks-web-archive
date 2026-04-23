// Slot-aware dispatch worker.
//
// Replaces the general "should we nudge this user?" approach with a concrete
// query: find every pending slot whose scheduled_at has arrived, check the
// user's notification preferences, and fire if eligible.
//
// Run this on a schedule (e.g. every 5–15 minutes via pg_cron or an external
// cron trigger). Each run is idempotent — already-notified slots are skipped.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getLocalHHMM } from '../notifications-plan/usageLogic.ts';

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

type DueSlot = {
  id: string;
  user_id: string;
  exercise_id: string;
  scheduled_at: string;
  day_key: string;
};

type NotifPrefs = {
  push_enabled: boolean;
  timezone: string;
  quiet_hours_enabled: boolean;
  quiet_start_local: string;
  quiet_end_local: string;
};

function isInQuietHours(nowLocalHHMM: string, start: string, end: string): boolean {
  // Handles overnight ranges e.g. 21:30 → 07:00.
  if (start <= end) {
    return nowLocalHHMM >= start && nowLocalHHMM < end;
  }
  return nowLocalHHMM >= start || nowLocalHHMM < end;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const supabaseUrl            = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(500, { error: 'Missing Supabase environment configuration.' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const now      = new Date();

  // Find all pending slots whose scheduled_at has arrived.
  const { data: dueSlots, error: slotsError } = await supabase
    .from('daily_snack_assignments')
    .select('id,user_id,exercise_id,scheduled_at,day_key')
    .eq('status', 'pending')
    .lte('scheduled_at', now.toISOString())
    .limit(500);

  if (slotsError) return jsonResponse(500, { error: slotsError.message });
  if (!dueSlots || dueSlots.length === 0) {
    return jsonResponse(200, { notified: 0, skipped: 0, run_at: now.toISOString() });
  }

  // Load notification preferences for all affected users in one query.
  const userIds = [...new Set((dueSlots as DueSlot[]).map((s) => s.user_id))];
  const { data: prefRows } = await supabase
    .from('notification_preferences')
    .select('user_id,push_enabled,timezone,quiet_hours_enabled,quiet_start_local,quiet_end_local')
    .in('user_id', userIds);

  const prefsByUser = new Map<string, NotifPrefs>(
    (prefRows ?? []).map((r) => [r.user_id as string, r as NotifPrefs])
  );

  let notified = 0;
  let skipped  = 0;

  for (const slot of dueSlots as DueSlot[]) {
    const prefs = prefsByUser.get(slot.user_id);

    // Skip if push is disabled or no prefs on record.
    if (!prefs?.push_enabled) {
      skipped++;
      continue;
    }

    // Skip if currently in quiet hours.
    if (prefs.quiet_hours_enabled) {
      const localHHMM = getLocalHHMM(now, prefs.timezone ?? 'UTC');
      if (isInQuietHours(localHHMM, prefs.quiet_start_local, prefs.quiet_end_local)) {
        skipped++;
        continue;
      }
    }

    // Mark the slot as notified and log the nudge event.
    const [{ error: updateError }, { error: logError }] = await Promise.all([
      supabase
        .from('daily_snack_assignments')
        .update({ status: 'notified' })
        .eq('id', slot.id),
      supabase
        .from('nudge_event_log')
        .insert({
          user_id:    slot.user_id,
          nudge_type: 'snack_ready',
          status:     'sent',
          reason:     `slot_id:${slot.id}`,
        }),
    ]);

    if (updateError || logError) {
      skipped++;
    } else {
      notified++;
    }
  }

  return jsonResponse(200, {
    notified,
    skipped,
    scanned: dueSlots.length,
    run_at: now.toISOString(),
  });
});
