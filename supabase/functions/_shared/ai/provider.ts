// AI capability factory.
//
// Each capability (space analysis, exercise generation, nudge copy, …) is
// independently routed to the model best suited for that task via env vars:
//
//   AI_<CAPABILITY>_PROVIDER  — which provider to use (claude | openai)
//   AI_<CAPABILITY>_MODEL     — which model within that provider (optional)
//   ANTHROPIC_API_KEY         — API key for all Claude calls
//   OPENAI_API_KEY            — API key for all OpenAI calls
//
// Swapping a capability to a different model is a secrets-only change —
// no code changes required.

import type { SpaceAnalysisCapability } from './types.ts';
import { ClaudeSpaceAnalysis } from './models/claude.ts';
import { OpenAISpaceAnalysis } from './models/openai.ts';

function requireEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function createSpaceAnalysisProvider(): SpaceAnalysisCapability {
  const provider = Deno.env.get('AI_SPACE_ANALYSIS_PROVIDER') ?? 'claude';
  const model    = Deno.env.get('AI_SPACE_ANALYSIS_MODEL');

  switch (provider) {
    case 'claude':
      return new ClaudeSpaceAnalysis(
        requireEnv('ANTHROPIC_API_KEY'),
        model ?? 'claude-sonnet-4-6',
      );
    case 'openai':
      return new OpenAISpaceAnalysis(
        requireEnv('OPENAI_API_KEY'),
        model ?? 'gpt-4o',
      );
    default:
      throw new Error(
        `Unknown AI_SPACE_ANALYSIS_PROVIDER: "${provider}". Supported values: claude, openai`,
      );
  }
}
