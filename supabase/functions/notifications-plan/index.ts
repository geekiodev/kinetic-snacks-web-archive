import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getEntitlements } from '../_shared/entitlements.ts';
import { computeNotificationPlanDecision, getLocalHHMM } from './usageLogic.ts';

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
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: 'Missing Supabase environment configuration.' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) {
    return jsonResponse(401, { error: 'Missing Authorization header.' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return jsonResponse(401, {
      error: 'Unauthorized',
      details: authError?.message ?? 'User not found',
    });
  }

  const body = await req.json().catch(() => ({}));
  const now = body.now_utc ? new Date(body.now_utc) : new Date();
  const dryRun = body.dry_run === true;
  const dayKey = now.toISOString().slice(0, 10);

  const [{ entitlements }, { data: prefData }, { data: policyData }, { count: todaySentCount }, { data: recent }] = await Promise.all([
    getEntitlements(supabase, authData.user.id),
    supabase
      .from('notification_preferences')
      .select('push_enabled,timezone,quiet_hours_enabled,quiet_start_local,quiet_end_local,max_daily_notifications_override')
      .eq('user_id', authData.user.id)
      .maybeSingle(),
    supabase
      .from('notification_policy_config')
      .select('max_daily_notifications_free,max_daily_notifications_premium,ignored_backoff_threshold,ignored_backoff_daily_cap')
      .eq('id', 'global')
      .single(),
    supabase
      .from('nudge_event_log')
      .select('id', { head: true, count: 'exact' })
      .eq('user_id', authData.user.id)
      .eq('status', 'sent')
      .gte('created_at', `${dayKey}T00:00:00.000Z`)
      .lt('created_at', `${dayKey}T23:59:59.999Z`),
    supabase
      .from('nudge_event_log')
      .select('status')
      .eq('user_id', authData.user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const prefs = {
    push_enabled: prefData?.push_enabled ?? true,
    timezone: prefData?.timezone ?? 'UTC',
    quiet_hours_enabled: prefData?.quiet_hours_enabled ?? true,
    quiet_start_local: prefData?.quiet_start_local ?? '21:30',
    quiet_end_local: prefData?.quiet_end_local ?? '07:00',
    max_daily_notifications_override: prefData?.max_daily_notifications_override ?? null,
  };

  const policy = {
    max_daily_notifications_free: policyData?.max_daily_notifications_free ?? 2,
    max_daily_notifications_premium: policyData?.max_daily_notifications_premium ?? 4,
    ignored_backoff_threshold: policyData?.ignored_backoff_threshold ?? 3,
    ignored_backoff_daily_cap: policyData?.ignored_backoff_daily_cap ?? 1,
  };

  const consecutiveIgnored = (recent ?? []).findIndex((entry) => entry.status !== 'dismissed');
  const ignoredCount = consecutiveIgnored === -1 ? (recent?.length ?? 0) : consecutiveIgnored;

  const decision = computeNotificationPlanDecision({
    nowLocalHHMM: getLocalHHMM(now, prefs.timezone),
    isPremium: Boolean(entitlements.can_use_space_analysis),
    todaySentCount: todaySentCount ?? 0,
    consecutiveIgnored: ignoredCount,
    preferences: prefs,
    policy,
  });

  if (decision.send_now && !dryRun) {
    const { error } = await supabase.from('nudge_event_log').insert({
      user_id: authData.user.id,
      nudge_type: decision.nudge_type,
      status: 'sent',
      reason: decision.reason,
    });

    if (error) {
      return jsonResponse(500, { error: error.message });
    }
  }

  return jsonResponse(200, {
    ...decision,
    dry_run: dryRun,
    next_eligible_at: null,
  });
});
