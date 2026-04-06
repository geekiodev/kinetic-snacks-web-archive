import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getEntitlements } from '../_shared/entitlements.ts';
import { canCreateAssignment, canUseSwap, getRemaining } from './usageLogic.ts';

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
  swap?: boolean;
  candidate_exercise_ids?: string[];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
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

  const body = (await req.json().catch(() => ({}))) as Payload;
  const now = new Date();
  const dayKey = body.day_key ?? now.toISOString().slice(0, 10);
  const candidateExerciseIds = (body.candidate_exercise_ids ?? []).filter(Boolean);
  const isSwap = body.swap === true;

  if (candidateExerciseIds.length === 0) {
    return jsonResponse(400, { error: 'candidate_exercise_ids is required.' });
  }

  const [{ entitlements }, { data: existingRows, error: existingError }] = await Promise.all([
    getEntitlements(supabase, authData.user.id),
    supabase
      .from('daily_snack_assignments')
      .select('id,assignment_index,exercise_id,source')
      .eq('user_id', authData.user.id)
      .eq('day_key', dayKey)
      .order('assignment_index', { ascending: true }),
  ]);

  if (existingError) {
    return jsonResponse(500, { error: existingError.message });
  }

  const rows = existingRows ?? [];
  const latest = rows[rows.length - 1] ?? null;

  const assignmentLimit = entitlements.daily_exercise_views;
  const swapLimit = entitlements.can_use_space_analysis ? null : 1;

  const assignmentsUsed = rows.length;
  const swapsUsed = rows.filter((row) => row.source === 'manual_swap').length;

  if (!isSwap && latest) {
    return jsonResponse(200, {
      assignment_id: latest.id,
      assigned_exercise_id: latest.exercise_id,
      source: latest.source,
      remaining_assignments: getRemaining(assignmentLimit, assignmentsUsed),
      remaining_swaps: getRemaining(swapLimit, swapsUsed),
      created: false,
    });
  }

  if (!canCreateAssignment({ assignmentLimit, assignmentsUsed })) {
    return jsonResponse(200, {
      allowed: false,
      reason: 'assignment_limit_reached',
      remaining_assignments: 0,
      remaining_swaps: getRemaining(swapLimit, swapsUsed),
      assignment_id: latest?.id ?? null,
      assigned_exercise_id: latest?.exercise_id ?? null,
    });
  }

  if (isSwap && !canUseSwap({ swapLimit, swapsUsed })) {
    return jsonResponse(200, {
      allowed: false,
      reason: 'swap_limit_reached',
      remaining_assignments: getRemaining(assignmentLimit, assignmentsUsed),
      remaining_swaps: 0,
      assignment_id: latest?.id ?? null,
      assigned_exercise_id: latest?.exercise_id ?? null,
    });
  }

  const available = latest
    ? candidateExerciseIds.filter((exerciseId) => exerciseId !== latest.exercise_id)
    : candidateExerciseIds;

  if (available.length === 0) {
    return jsonResponse(200, {
      allowed: false,
      reason: 'no_alternative_candidates',
      remaining_assignments: getRemaining(assignmentLimit, assignmentsUsed),
      remaining_swaps: getRemaining(swapLimit, swapsUsed),
      assignment_id: latest?.id ?? null,
      assigned_exercise_id: latest?.exercise_id ?? null,
    });
  }

  const nextExerciseId = available[0];
  const nextAssignmentIndex = (latest?.assignment_index ?? 0) + 1;
  const source = isSwap ? 'manual_swap' : 'auto';

  const { data: inserted, error: insertError } = await supabase
    .from('daily_snack_assignments')
    .insert({
      user_id: authData.user.id,
      day_key: dayKey,
      assignment_index: nextAssignmentIndex,
      exercise_id: nextExerciseId,
      source,
    })
    .select('id,exercise_id,source')
    .single();

  if (insertError || !inserted) {
    return jsonResponse(500, { error: insertError?.message ?? 'Unable to create assignment.' });
  }

  const updatedAssignmentsUsed = assignmentsUsed + 1;
  const updatedSwapsUsed = swapsUsed + (isSwap ? 1 : 0);

  return jsonResponse(200, {
    allowed: true,
    assignment_id: inserted.id,
    assigned_exercise_id: inserted.exercise_id,
    source: inserted.source,
    remaining_assignments: getRemaining(assignmentLimit, updatedAssignmentsUsed),
    remaining_swaps: getRemaining(swapLimit, updatedSwapsUsed),
    created: true,
  });
});
