import type { SpaceAnalysisCapability, SpaceAnalysisInput, SpaceAnalysisResult } from '../types.ts';

// Stub — wire up when switching to OpenAI vision.
// Set AI_SPACE_ANALYSIS_PROVIDER=openai and OPENAI_API_KEY to activate.
export class OpenAISpaceAnalysis implements SpaceAnalysisCapability {
  private model: string;

  constructor(_apiKey: string, model: string) {
    this.model = model;
  }

  async analyzeSpace(_input: SpaceAnalysisInput): Promise<SpaceAnalysisResult> {
    throw new Error(
      `OpenAI space analysis (model: ${this.model}) is not yet implemented. ` +
      `Set AI_SPACE_ANALYSIS_PROVIDER=claude to use the Claude implementation.`,
    );
  }
}
