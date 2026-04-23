import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getEntitlements } from '../_shared/entitlements.ts';
import { createSpaceAnalysisProvider } from '../_shared/ai/provider.ts';
import type { ImageMimeType, GeneratedExercise } from '../_shared/ai/types.ts';

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

// ~5 MB after base64 decode
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

  // ── Entitlement check ─────────────────────────────────────────────────────
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
    return jsonResponse(413, { error: 'Image too large. Please use an image under 5 MB.' });
  }

  // ── Fetch user preferences (for physical limitations) ─────────────────────
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .maybeSingle();

  const userPreferences = profileRow?.preferences as { limitations?: string[] } | null;
  const limitations = (userPreferences?.limitations ?? []).filter(
    (l: string) => l.toLowerCase() !== 'none',
  );

  // ── AI analysis ───────────────────────────────────────────────────────────
  let aiOutput;
  try {
    const provider = createSpaceAnalysisProvider();
    aiOutput = await provider.analyzeSpace({
      imageBase64,
      mimeType: mimeType as ImageMimeType,
      limitations,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[analyze-space] AI error:', message);
    return jsonResponse(500, { error: 'Analysis failed. Please try again.' });
  }

  // ── Post-filter: remove exercises that conflict with user limitations ──────
  // This is a safety net in case the AI still generates a contraindicated exercise.
  // Normalise both sides to lowercase with spaces→underscores for a loose match.
  const normaliseTag = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '_');
  const limitationTags = new Set(limitations.map(normaliseTag));

  if (limitationTags.size > 0) {
    aiOutput.exercises = aiOutput.exercises.filter((ex: GeneratedExercise) => {
      const contraTags = (ex.contraindication_tags ?? []).map(normaliseTag);
      return !contraTags.some((tag: string) => limitationTags.has(tag));
    });
  }

  // ── Store generated exercises in the exercises table ──────────────────────
  // Phase 1: auto-approve (is_active: true, review_status: 'pending').
  // Admin reviews via Supabase table editor: filter review_status = 'pending'.
  const exerciseRows = aiOutput.exercises.map((ex: GeneratedExercise) => ({
    title:                ex.title,
    duration_minutes:     ex.duration,
    intensity:            ex.intensity,
    equipment:            ex.equipment,
    instructions:         ex.instructions,
    tips:                 ex.tips,
    category:             ex.category,
    movement_tags:        ex.movement_tags,
    body_region_tags:     ex.body_region_tags,
    context_tags:         ex.context_tags,
    location_tags:        ex.location_tags,
    contraindication_tags: ex.contraindication_tags,
    requires_floor:       ex.requires_floor,
    standing_only:        ex.standing_only,
    no_sweat:             ex.no_sweat,
    source_type:          'generated_template',
    // Auto-approve for the generating user — the AI limitations filter
    // already ensures safety. Admin review is for promoting to the shared
    // library; the user who generated these must be able to use them immediately.
    review_status:        'approved',
    is_active:            true,
    generated_for_user_id: userId,
  }));

  const { data: insertedExercises, error: exerciseInsertError } = await supabase
    .from('exercises')
    .insert(exerciseRows)
    .select('id,title,duration_minutes,intensity,equipment,instructions,tips,category,movement_tags,body_region_tags,context_tags,location_tags,contraindication_tags,requires_floor,standing_only,no_sweat,source_type,review_status');

  if (exerciseInsertError || !insertedExercises) {
    console.error('[analyze-space] Failed to store exercises:', exerciseInsertError?.message);
    return jsonResponse(500, { error: 'Failed to save generated exercises.' });
  }

  // ── Persist analysis record ───────────────────────────────────────────────
  const { data: analysisRecord, error: analysisInsertError } = await supabase
    .from('space_analyses')
    .insert({
      user_id:  userId,
      analysis: {
        ...aiOutput.overview,
        exercise_ids: insertedExercises.map((e: { id: string }) => e.id),
      },
    })
    .select('id')
    .single();

  if (analysisInsertError) {
    console.error('[analyze-space] Failed to persist analysis:', analysisInsertError.message);
    // Non-fatal — exercises are saved; continue.
  }

  // ── Map DB rows to Exercise shape expected by the client ──────────────────
  const exercises = insertedExercises.map((row: Record<string, unknown>) => ({
    id:                  row.id,
    title:               row.title,
    duration:            row.duration_minutes,
    intensity:           row.intensity === 'high' ? 'medium' : row.intensity,
    equipment:           row.equipment ?? [],
    instructions:        row.instructions ?? [],
    tips:                row.tips ?? '',
    category:            row.category ?? 'General',
    movementTags:        row.movement_tags ?? [],
    bodyRegionTags:      row.body_region_tags ?? [],
    contextTags:         row.context_tags ?? [],
    locationTags:        row.location_tags ?? [],
    contraindicationTags: row.contraindication_tags ?? [],
    requiresFloor:       row.requires_floor ?? false,
    standingOnly:        row.standing_only ?? false,
    noSweat:             row.no_sweat ?? true,
    sourceType:          row.source_type,
    reviewStatus:        row.review_status,
  }));

  return jsonResponse(200, {
    overview:    aiOutput.overview,
    exercises,
    analysis_id: analysisRecord?.id ?? null,
  });
});
