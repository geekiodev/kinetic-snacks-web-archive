import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.37.0';
import type { SpaceAnalysisCapability, SpaceAnalysisInput, SpaceAnalysisResult } from '../types.ts';

const SPACE_ANALYSIS_SYSTEM = `You are a certified personal trainer and fitness space optimization expert.
Analyze workout spaces to help people get the most from their available environment.
Always respond with valid JSON only — no markdown fences, no explanation, just the raw JSON object.`;

const SPACE_ANALYSIS_PROMPT = `Analyze this workout space and return a JSON object with exactly this shape:

{
  "dimensions": "estimated room dimensions as a descriptive string (e.g. '12ft × 10ft, 8ft ceiling')",
  "usableSpace": "description of clear floor area available for movement",
  "detectedEquipment": ["every piece of equipment or furniture usable for exercise that you can see"],
  "floorType": "one of: carpet, hardwood, tile, concrete, mat, mixed, unknown",
  "obstacles": ["anything that limits movement or poses a risk — low ceilings, furniture, poor lighting, etc."],
  "recommendations": [
    {
      "title": "Exercise or routine name",
      "description": "Why this suits the space and how to perform it here — be specific to what you observe",
      "equipment": ["equipment from the image needed for this"]
    }
  ],
  "safetyNotes": ["concrete safety observations specific to this space — not generic advice"]
}

Rules:
- Provide 3–5 recommendations tailored to the specific space you see.
- Reference actual items visible in the photo — do not invent equipment.
- If you cannot determine something confidently, give your best estimate and note the uncertainty inline.
- safetyNotes must be space-specific, not boilerplate.`;

export class ClaudeSpaceAnalysis implements SpaceAnalysisCapability {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async analyzeSpace(input: SpaceAnalysisInput): Promise<SpaceAnalysisResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
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
              text: SPACE_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';

    // Strip accidental markdown fences before parsing.
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

    return JSON.parse(cleaned) as SpaceAnalysisResult;
  }
}
