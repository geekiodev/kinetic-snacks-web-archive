import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getEntitlements } from '../_shared/entitlements.ts';
import { createSpaceAnalysisProvider } from '../_shared/ai/provider.ts';
import type { ImageMimeType } from '../_shared/ai/types.ts';

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

const SUPPORTED_MIME_TYPES: ImageMimeType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

// ~5 MB after base64 decode  (base64 inflates by ~33%, so 6.7 MB of base64 ≈ 5 MB raw)
const MAX_BASE64_CHARS = 7 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const supabaseUrl     = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: 'Missing Supabase environment configuration.' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return jsonResponse(401, { error: 'Missing Authorization header.' });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return jsonResponse(401, {
      error: 'Unauthorized',
      details: authError?.message ?? 'User not found',
    });
  }
  const userId = authData.user.id;

  // ── Entitlement check ────────────────────────────────────────────────────
  const { entitlements } = await getEntitlements(supabase, userId);
  if (!entitlements.can_use_space_analysis) {
    return jsonResponse(403, { error: 'Space analysis requires a Premium subscription.' });
  }

  // ── Parse & validate body ─────────────────────────────────────────────────
  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  const { imageBase64, mimeType } = body;

  if (!imageBase64 || !mimeType) {
    return jsonResponse(400, { error: 'imageBase64 and mimeType are required.' });
  }

  if (!(SUPPORTED_MIME_TYPES as string[]).includes(mimeType)) {
    return jsonResponse(400, {
      error: `Unsupported image type "${mimeType}". Accepted: ${SUPPORTED_MIME_TYPES.join(', ')}`,
    });
  }

  if (imageBase64.length > MAX_BASE64_CHARS) {
    return jsonResponse(413, {
      error: 'Image too large. Please use an image under 5 MB.',
    });
  }

  // ── AI analysis ───────────────────────────────────────────────────────────
  let result;
  try {
    const provider = createSpaceAnalysisProvider();
    result = await provider.analyzeSpace({
      imageBase64,
      mimeType: mimeType as ImageMimeType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[analyze-space] AI error:', message);
    return jsonResponse(500, { error: 'Analysis failed. Please try again.' });
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  const { error: insertError } = await supabase
    .from('space_analyses')
    .insert({ user_id: userId, analysis: result });

  if (insertError) {
    // Non-fatal — return the result even if persistence fails.
    console.error('[analyze-space] Failed to persist result:', insertError.message);
  }

  return jsonResponse(200, { result });
});
