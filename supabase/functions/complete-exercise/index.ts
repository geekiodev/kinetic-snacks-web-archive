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

type Payload = {
  exercise_id: string;
  slot_id?: string;
  duration_minutes?: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const supabaseUrl      = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey  = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Missing Supabase environment configuration.' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return jsonResponse(401, { error: 'Missing Authorization header.' });

  // User-scoped client — for authentication only.
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user) {
    return jsonResponse(401, { error: 'Unauthorized', details: authError?.message ?? 'User not found' });
  }
  const userId = authData.user.id;

  // Service-role client — for validated writes that bypass RLS.
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const body = (await req.json().catch(() => ({}))) as Payload;
  const { exercise_id, slot_id, duration_minutes } = body;

  if (!exercise_id) {
    return jsonResponse(400, { error: 'exercise_id is required.' });
  }

  // ── Verify exercise exists ────────────────────────────────────────────────
  const { data: exercise, error: exerciseError } = await admin
    .from('exercises')
    .select('id, duration_minutes')
    .eq('id', exercise_id)
    .maybeSingle();

  if (exerciseError || !exercise) {
    return jsonResponse(404, { error: 'Exercise not found.' });
  }

  // ── Verify slot ownership and state (if slot provided) ───────────────────
  if (slot_id) {
    const { data: slot, error: slotError } = await admin
      .from('daily_snack_assignments')
      .select('id, user_id, exercise_id, status')
      .eq('id', slot_id)
      .maybeSingle();

    if (slotError || !slot) {
      return jsonResponse(404, { error: 'Slot not found.' });
    }

    if (slot.user_id !== userId) {
      return jsonResponse(403, { error: 'This slot does not belong to you.' });
    }

    if (slot.status === 'completed') {
      return jsonResponse(409, { error: 'This slot has already been completed.' });
    }

    if (slot.exercise_id !== exercise_id) {
      return jsonResponse(400, { error: 'Exercise does not match the assigned slot.' });
    }

    // Check for existing completion on this slot (idempotency guard).
    const { data: existing } = await admin
      .from('exercise_completions')
      .select('id')
      .eq('slot_id', slot_id)
      .maybeSingle();

    if (existing) {
      return jsonResponse(200, { completion_id: existing.id, already_completed: true });
    }

    // Mark slot as completed atomically.
    const { error: updateError } = await admin
      .from('daily_snack_assignments')
      .update({ status: 'completed' })
      .eq('id', slot_id)
      .eq('user_id', userId);

    if (updateError) {
      return jsonResponse(500, { error: 'Failed to update slot status.' });
    }
  }

  // ── Record the completion ─────────────────────────────────────────────────
  const { data: completion, error: insertError } = await admin
    .from('exercise_completions')
    .insert({
      user_id:          userId,
      exercise_id:      exercise_id,
      slot_id:          slot_id ?? null,
      duration_minutes: duration_minutes ?? exercise.duration_minutes,
      completed_at:     new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) {
    // Unique constraint on slot_id — treat as idempotent success.
    if (insertError.code === '23505') {
      return jsonResponse(200, { already_completed: true });
    }
    return jsonResponse(500, { error: 'Failed to record completion.' });
  }

  return jsonResponse(200, {
    completion_id:    completion.id,
    exercise_id,
    slot_id:          slot_id ?? null,
    completed_at:     new Date().toISOString(),
  });
});
