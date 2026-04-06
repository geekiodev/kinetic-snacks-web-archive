import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getEntitlements } from '../_shared/entitlements.ts';
import { computeNotificationPlanDecision, getLocalHHMM } from '../notifications-plan/usageLogic.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(500, { error: 'Missing Supabase environment configuration.' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: policyData, error: policyError } = await supabase
    .from('notification_policy_config')
    .select('max_daily_notifications_free,max_daily_notifications_premium,ignored_backoff_threshold,ignored_backoff_daily_cap')
    .eq('id', 'global')
    .single();

  if (policyError) {
    return jsonResponse(500, { error: policyError.message });
  }

  const policy = {
    max_daily_notifications_free: policyData.max_daily_notifications_free,
    max_daily_notifications_premium: policyData.max_daily_notifications_premium,
    ignored_backoff_threshold: policyData.ignored_backoff_threshold,
    ignored_backoff_daily_cap: policyData.ignored_backoff_daily_cap,
  };

  const { data: preferenceRows, error: prefError } = await supabase
    .from('notification_preferences')
    .select('user_id,push_enabled,timezone,quiet_hours_enabled,quiet_start_local,quiet_end_local,max_daily_notifications_override')
    .eq('push_enabled', true)
    .limit(200);

  if (prefError) {
    return jsonResponse(500, { error: prefError.message });
  }

  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  let queued = 0;

  for (const row of preferenceRows ?? []) {
    const { entitlements } = await getEntitlements(supabase, row.user_id);

    const [{ count: todaySentCount }, { data: recent }] = await Promise.all([
      supabase
        .from('nudge_event_log')
        .select('id', { head: true, count: 'exact' })
        .eq('user_id', row.user_id)
        .eq('status', 'sent')
        .gte('created_at', `${dayKey}T00:00:00.000Z`)
        .lt('created_at', `${dayKey}T23:59:59.999Z`),
      supabase
        .from('nudge_event_log')
        .select('status')
        .eq('user_id', row.user_id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const consecutiveIgnored = (recent ?? []).findIndex((entry) => entry.status !== 'dismissed');
    const ignoredCount = consecutiveIgnored === -1 ? (recent?.length ?? 0) : consecutiveIgnored;

    const decision = computeNotificationPlanDecision({
      nowLocalHHMM: getLocalHHMM(now, row.timezone ?? 'UTC'),
      isPremium: Boolean(entitlements.can_use_space_analysis),
      todaySentCount: todaySentCount ?? 0,
      consecutiveIgnored: ignoredCount,
      preferences: {
        push_enabled: row.push_enabled,
        timezone: row.timezone,
        quiet_hours_enabled: row.quiet_hours_enabled,
        quiet_start_local: row.quiet_start_local,
        quiet_end_local: row.quiet_end_local,
        max_daily_notifications_override: row.max_daily_notifications_override,
      },
      policy,
    });

    if (!decision.send_now) {
      continue;
    }

    const { error } = await supabase.from('nudge_event_log').insert({
      user_id: row.user_id,
      nudge_type: decision.nudge_type,
      status: 'planned',
      reason: decision.reason,
    });

    if (!error) {
      queued += 1;
    }
  }

  return jsonResponse(200, { queued, scanned: preferenceRows?.length ?? 0, run_at: now.toISOString() });
});
