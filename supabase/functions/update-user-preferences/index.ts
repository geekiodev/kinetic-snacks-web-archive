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
const MIN_DURATION = 3;
const MAX_DURATION = 60;

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function isValidTimeString(t: string): boolean {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(t);
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

  const { preferences, notificationPreferences, timezone } = body as {
    preferences?: {
      limitations?: string[];
      equipment?: string[];
      location?: string[];
      intensityLevel?: string;
      duration?: number;
    };
    notificationPreferences?: {
      pushEnabled?: boolean;
      quietHoursEnabled?: boolean;
      quietStartLocal?: string;
      quietEndLocal?: string;
      reminderWindow?: string;
      maxDailyNotifications?: number | null;
    };
    timezone?: string;
  };

  // ── Validate preferences ─────────────────────────────────────────────────
  if (preferences) {
    if (preferences.intensityLevel !== undefined &&
        !VALID_INTENSITY_LEVELS.includes(preferences.intensityLevel)) {
      return jsonResponse(400, {
        error: `intensityLevel must be one of: ${VALID_INTENSITY_LEVELS.join(', ')}`,
      });
    }

    if (preferences.duration !== undefined) {
      const d = Number(preferences.duration);
      if (!Number.isFinite(d) || d < MIN_DURATION || d > MAX_DURATION) {
        return jsonResponse(400, {
          error: `duration must be between ${MIN_DURATION} and ${MAX_DURATION} minutes.`,
        });
      }
    }

    if (!Array.isArray(preferences.limitations ?? [])) {
      return jsonResponse(400, { error: 'limitations must be an array.' });
    }
    if (!Array.isArray(preferences.equipment ?? [])) {
      return jsonResponse(400, { error: 'equipment must be an array.' });
    }
    if (!Array.isArray(preferences.location ?? [])) {
      return jsonResponse(400, { error: 'location must be an array.' });
    }
  }

  // ── Validate notification preferences ────────────────────────────────────
  const effectiveTz = timezone ?? 'UTC';
  if (timezone && !isValidTimezone(timezone)) {
    return jsonResponse(400, { error: `Invalid timezone: "${timezone}".` });
  }

  if (notificationPreferences) {
    const { quietStartLocal, quietEndLocal, reminderWindow } = notificationPreferences;

    if (quietStartLocal && !isValidTimeString(quietStartLocal)) {
      return jsonResponse(400, { error: 'quietStartLocal must be HH:MM format.' });
    }
    if (quietEndLocal && !isValidTimeString(quietEndLocal)) {
      return jsonResponse(400, { error: 'quietEndLocal must be HH:MM format.' });
    }
    if (reminderWindow && !VALID_REMINDER_WINDOWS.includes(reminderWindow)) {
      return jsonResponse(400, {
        error: `reminderWindow must be one of: ${VALID_REMINDER_WINDOWS.join(', ')}`,
      });
    }
  }

  // ── Write atomically ─────────────────────────────────────────────────────
  const now = new Date().toISOString();

  if (preferences) {
    const { error: profileError } = await admin
      .from('profiles')
      .update({ preferences, updated_at: now })
      .eq('id', userId);

    if (profileError) {
      return jsonResponse(500, { error: 'Failed to save preferences.' });
    }
  }

  if (notificationPreferences || timezone) {
    const np = notificationPreferences ?? {};
    const upsertRow: Record<string, unknown> = {
      user_id:    userId,
      timezone:   effectiveTz,
      updated_at: now,
    };
    if (np.pushEnabled         !== undefined) upsertRow.push_enabled                    = np.pushEnabled;
    if (np.quietHoursEnabled   !== undefined) upsertRow.quiet_hours_enabled             = np.quietHoursEnabled;
    if (np.quietStartLocal     !== undefined) upsertRow.quiet_start_local               = np.quietStartLocal;
    if (np.quietEndLocal       !== undefined) upsertRow.quiet_end_local                 = np.quietEndLocal;
    if (np.reminderWindow      !== undefined) upsertRow.reminder_window                 = np.reminderWindow;
    if (np.maxDailyNotifications !== undefined) upsertRow.max_daily_notifications_override = np.maxDailyNotifications;

    const { error: notifError } = await admin
      .from('notification_preferences')
      .upsert(upsertRow);

    if (notifError) {
      return jsonResponse(500, { error: 'Failed to save notification preferences.' });
    }
  }

  return jsonResponse(200, { success: true });
});
