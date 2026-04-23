import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const VALID_INTENSITY_LEVELS = ['low', 'medium'];
const VALID_REMINDER_WINDOWS = ['anytime', 'morning', 'midday', 'evening'];

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const supabaseUrl    = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Missing Supabase environment configuration.' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return jsonResponse(401, { error: 'Missing Authorization header.' });

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user) {
    return jsonResponse(401, { error: 'Unauthorized', details: authError?.message ?? 'User not found' });
  }
  const userId = authData.user.id;
  const admin  = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json().catch(() => null);
  if (!body) return jsonResponse(400, { error: 'Invalid JSON body.' });

  const { preferences, timezone } = body as {
    preferences: {
      limitations: string[];
      equipment: string[];
      location: string[];
      intensityLevel: string;
      duration: number;
      notificationSettings?: {
        pushEnabled?: boolean;
        quietHoursEnabled?: boolean;
        quietStartLocal?: string;
        quietEndLocal?: string;
        reminderWindow?: string;
        maxDailyNotifications?: number | null;
      };
    };
    timezone?: string;
  };

  // ── Validate required fields ──────────────────────────────────────────────
  if (!preferences) {
    return jsonResponse(400, { error: 'preferences is required.' });
  }
  if (!Array.isArray(preferences.location) || preferences.location.length === 0) {
    return jsonResponse(400, { error: 'At least one location is required.' });
  }
  if (!VALID_INTENSITY_LEVELS.includes(preferences.intensityLevel)) {
    return jsonResponse(400, { error: `intensityLevel must be one of: ${VALID_INTENSITY_LEVELS.join(', ')}` });
  }
  const duration = Number(preferences.duration);
  if (!Number.isFinite(duration) || duration < 3 || duration > 60) {
    return jsonResponse(400, { error: 'duration must be between 3 and 60 minutes.' });
  }

  const ns = preferences.notificationSettings ?? {};
  if (ns.reminderWindow && !VALID_REMINDER_WINDOWS.includes(ns.reminderWindow)) {
    return jsonResponse(400, { error: `reminderWindow must be one of: ${VALID_REMINDER_WINDOWS.join(', ')}` });
  }

  const effectiveTz = (timezone && isValidTimezone(timezone)) ? timezone : 'UTC';
  const now = new Date().toISOString();

  // ── Update profile with validated preferences ─────────────────────────────
  const { error: profileError } = await admin
    .from('profiles')
    .update({ preferences, updated_at: now })
    .eq('id', userId);

  if (profileError) {
    return jsonResponse(500, { error: 'Failed to save profile.' });
  }

  // ── Upsert notification_preferences ──────────────────────────────────────
  const { error: notifError } = await admin
    .from('notification_preferences')
    .upsert({
      user_id:                          userId,
      timezone:                         effectiveTz,
      push_enabled:                     ns.pushEnabled           ?? true,
      quiet_hours_enabled:              ns.quietHoursEnabled     ?? true,
      quiet_start_local:                ns.quietStartLocal       ?? '21:30',
      quiet_end_local:                  ns.quietEndLocal         ?? '07:00',
      reminder_window:                  ns.reminderWindow        ?? 'anytime',
      max_daily_notifications_override: ns.maxDailyNotifications ?? null,
      updated_at:                       now,
    });

  if (notifError) {
    return jsonResponse(500, { error: 'Failed to save notification preferences.' });
  }

  // ── Ensure subscriptions row exists for this user (free plan) ─────────────
  const { data: freePlan } = await admin
    .from('plans')
    .select('id')
    .eq('name', 'free')
    .maybeSingle();

  if (freePlan?.id) {
    await admin
      .from('subscriptions')
      .upsert(
        { user_id: userId, plan_id: freePlan.id, status: 'active', updated_at: now },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );
  }

  return jsonResponse(200, { success: true });
});
