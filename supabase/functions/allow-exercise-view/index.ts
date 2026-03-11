import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { computeUsageDecision } from './usageLogic.ts';
import { getEntitlements } from '../_shared/entitlements.ts';

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
  console.log('allow-exercise-view invoked');
  console.log('Authorization header present:', Boolean(authHeader));
  console.log('getUser error:', authError?.message);
  console.log('user id:', authData?.user?.id);

  if (authError || !authData?.user) {
    return jsonResponse(401, {
      error: 'Unauthorized',
      details: authError?.message ?? 'User not found',
    });
  }

  let payload: { exercise_id?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  const exerciseId = payload.exercise_id;
  if (!exerciseId) {
    return jsonResponse(400, { error: 'exercise_id is required.' });
  }

  const dayKey = new Date().toISOString().slice(0, 10);

  const { entitlements } = await getEntitlements(supabase, authData.user.id);
  const limit = entitlements.daily_exercise_views;

  if (limit === null) {
    return jsonResponse(200, { allowed: true, remaining: null, limit });
  }

  if (limit <= 0) {
    return jsonResponse(200, { allowed: false, remaining: 0, limit });
  }

  const { count: totalCount, error: countError } = await supabase
    .from('exercise_views')
    .select('exercise_id', { head: true, count: 'exact' })
    .eq('user_id', authData.user.id)
    .eq('day_key', dayKey);

  if (countError) {
    return jsonResponse(500, { error: countError.message });
  }

  const { count: existingCount, error: existingError } = await supabase
    .from('exercise_views')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', authData.user.id)
    .eq('exercise_id', exerciseId)
    .eq('day_key', dayKey);

  if (existingError) {
    return jsonResponse(500, { error: existingError.message });
  }

  const alreadyViewed = (existingCount ?? 0) > 0;
  const currentCount = totalCount ?? 0;
  const decision = computeUsageDecision({ limit, currentCount, alreadyViewed });

  if (!decision.allowed) {
    return jsonResponse(200, { allowed: false, remaining: decision.remaining, limit });
  }

  if (decision.shouldInsert) {
    const { error: insertError } = await supabase.from('exercise_views').insert({
      user_id: authData.user.id,
      exercise_id: exerciseId,
      day_key: dayKey,
    });

    if (insertError) {
      return jsonResponse(500, { error: insertError.message });
    }
  }

  return jsonResponse(200, { allowed: true, remaining: decision.remaining, limit });
});
