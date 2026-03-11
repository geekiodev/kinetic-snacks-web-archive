import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
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

const monthKey = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return start.toISOString().slice(0, 10);
};

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
  console.log('allow-exercise-generation invoked');
  console.log('Authorization header present:', Boolean(authHeader));
  console.log('getUser error:', authError?.message);
  console.log('user id:', authData?.user?.id);

  if (authError || !authData?.user) {
    return jsonResponse(401, {
      error: 'Unauthorized',
      details: authError?.message ?? 'User not found',
    });
  }

  const { entitlements } = await getEntitlements(supabase, authData.user.id);
  const limit = entitlements.monthly_exercise_generations;

  if (limit === null) {
    return jsonResponse(200, { allowed: true, remaining: null, limit });
  }

  if (limit <= 0) {
    return jsonResponse(200, { allowed: false, remaining: 0, limit });
  }

  const key = monthKey();
  const { count, error: countError } = await supabase
    .from('exercise_generations')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', authData.user.id)
    .eq('month_key', key);

  if (countError) {
    return jsonResponse(500, { error: countError.message });
  }

  const currentCount = count ?? 0;
  if (currentCount >= limit) {
    return jsonResponse(200, { allowed: false, remaining: 0, limit });
  }

  const { error: insertError } = await supabase.from('exercise_generations').insert({
    user_id: authData.user.id,
    month_key: key,
  });

  if (insertError) {
    return jsonResponse(500, { error: insertError.message });
  }

  const remaining = Math.max(0, limit - (currentCount + 1));
  return jsonResponse(200, { allowed: true, remaining, limit });
});
