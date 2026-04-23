import type {
  SpaceAnalysisCapability,
  SpaceAnalysisInput,
  SpaceAnalysisOutput,
} from '../types.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const SPACE_ANALYSIS_SYSTEM = `You are a certified personal trainer and fitness space optimization expert.
Analyze workout spaces and generate structured, safe exercise programs tailored to exactly what you observe.
Always respond with valid JSON only — no markdown fences, no explanation, just the raw JSON object.`;

const SPACE_ANALYSIS_PROMPT = `Analyze this workout space and return a JSON object with exactly this shape:

{
  "overview": {
    "dimensions": "estimated room dimensions (e.g. '12ft × 10ft, 8ft ceiling')",
    "usableSpace": "description of clear floor area available for movement",
    "detectedEquipment": ["every piece of equipment or furniture usable for exercise"],
    "floorType": "one of: carpet, hardwood, tile, concrete, mat, mixed, unknown",
    "obstacles": ["anything limiting movement or posing a risk"],
    "safetyNotes": ["space-specific safety observations — not generic advice"]
  },
  "exercises": [
    {
      "title": "Short, descriptive exercise name",
      "duration": <integer minutes, 3–15>,
      "intensity": "<low or medium>",
      "equipment": ["equipment from the image required for this exercise"],
      "instructions": [
        "Step 1: ...",
        "Step 2: ...",
        "Step 3: ..."
      ],
      "tips": "One sentence of coaching advice specific to this space or exercise",
      "category": "one of: mobility, strength, cardio, balance, flexibility, core",
      "movement_tags": ["hinge", "push", "pull", "squat", "carry", "rotate", "walk", "jump"],
      "body_region_tags": ["upper_body", "lower_body", "full_body", "core", "back", "shoulders"],
      "context_tags": ["office_friendly", "low_sweat", "quiet", "high_energy"],
      "location_tags": ["home", "office", "gym", "outdoor"],
      "contraindication_tags": [],
      "requires_floor": <true or false>,
      "standing_only": <true or false>,
      "no_sweat": <true or false>
    }
  ]
}

Rules:
- Generate 3–5 exercises, each tailored to the specific space and equipment visible.
- instructions must have at least 3 clear steps.
- duration must be an integer between 3 and 15.
- intensity must be exactly "low" or "medium" — never "high".
- contraindication_tags: only populate if the exercise is unsafe for specific conditions (e.g. ["knee_issues", "back_pain"]). Leave empty if broadly safe.
- Reference only equipment actually visible in the photo.
- no_sweat: true if the exercise is appropriate for an office setting without changing clothes.`;

export class ClaudeSpaceAnalysis implements SpaceAnalysisCapability {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeSpace(input: SpaceAnalysisInput): Promise<SpaceAnalysisOutput> {
    const activeLimitations = (input.limitations ?? []).filter(
      (l) => l.toLowerCase() !== 'none',
    );
    const limitationClause = activeLimitations.length > 0
      ? `\n\nIMPORTANT — User physical limitations: ${activeLimitations.join(', ')}.\n\n` +
        `Rules for handling limitations:\n` +
        `- Only skip or tag an exercise as contraindicated if it DIRECTLY loads or stresses the affected area.\n` +
        `- Do NOT exclude an exercise merely because the body part is mentioned in passing (e.g. "keep hips neutral" does not make an exercise contraindicated for Hip Pain).\n` +
        `- Specific guidance:\n` +
        `  • Hip Pain: contraindicated = hip hinges, kettlebell swings, deadlifts, lunges, squats, step-ups, hip thrusts. SAFE = seated exercises, upper body work, farmer carries, gentle mobility.\n` +
        `  • Knee Issues: contraindicated = jumps, lunges, deep squats, plyometrics, burpees. SAFE = upper body, seated, hip hinge patterns with straight legs.\n` +
        `  • Back Pain: contraindicated = deadlifts, forward folds under load, spinal rotation under load, bent-over rows heavy. SAFE = seated, standing upright, core bracing exercises.\n` +
        `  • Shoulder Injury: contraindicated = overhead press, push-ups, pull-ups, upright rows. SAFE = lower body, seated, hip-dominant movements.\n` +
        `  • Wrist Problems: contraindicated = planks, push-ups, bear crawls, wrist-bearing positions. SAFE = any exercise that does not bear weight through the wrist.\n` +
        `  • Ankle Issues: contraindicated = jumps, plyometrics, single-leg balance, jump rope. SAFE = seated, upper body, bilateral standing with stable base.\n` +
        `- Set contraindication_tags only when the exercise is genuinely unsafe — an empty array is correct for most exercises.\n` +
        `- Generate as many exercises as possible that ARE safe; do not over-restrict.`
      : '';

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: SPACE_ANALYSIS_SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: input.mimeType,
                  data: input.imageBase64,
                },
              },
              {
                type: 'text',
                text: SPACE_ANALYSIS_PROMPT + limitationClause,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
    }

    const json = await response.json() as {
      content: Array<{ type: string; text?: string }>;
    };

    const raw = json.content.find((b) => b.type === 'text')?.text ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

    return JSON.parse(cleaned) as SpaceAnalysisOutput;
  }
}
