// ─── Space Analysis ───────────────────────────────────────────────────────────

export type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export interface SpaceAnalysisInput {
  imageBase64: string;
  mimeType: ImageMimeType;
}

export interface SpaceRecommendation {
  title: string;
  description: string;
  equipment: string[];
}

export interface SpaceAnalysisResult {
  dimensions: string;
  usableSpace: string;
  detectedEquipment: string[];
  floorType: string;
  obstacles: string[];
  recommendations: SpaceRecommendation[];
  safetyNotes: string[];
}

// ─── Capability interfaces ────────────────────────────────────────────────────
// One interface per AI task. Each can be backed by a different model/provider.
// New capabilities are added here as they are implemented.

export interface SpaceAnalysisCapability {
  analyzeSpace(input: SpaceAnalysisInput): Promise<SpaceAnalysisResult>;
}
