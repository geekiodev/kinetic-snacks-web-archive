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
  console.log('allow-space-analysis invoked');
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
  const allowed = Boolean(entitlements.can_use_space_analysis);

  return jsonResponse(200, { allowed });
});
