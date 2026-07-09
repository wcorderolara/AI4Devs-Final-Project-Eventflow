// Tipos de dominio de AIRecommendation (US-097 / BE-002). Vista en shape del contrato API.
import type { AiFeatureType } from './ai-features.js';

export type AiRecommendationStatus = 'pending' | 'accepted' | 'edited' | 'rejected' | 'discarded' | 'failed' | 'expired';

export interface AiMeta {
  provider: string;
  promptVersion: string;
  latencyMs: number;
  fallbackUsed: boolean;
  languageCode: string;
}

export interface AiRecommendationView {
  id: string;
  type: string;
  status: AiRecommendationStatus;
  requestedByUserId: string;
  eventId: string | null;
  vendorProfileId: string | null;
  quoteRequestId: string | null;
  input: unknown;
  output: unknown;
  aiMeta: AiMeta | null;
  createdAt: string;
}

export interface CreateAiRecommendationData {
  requestedByUserId: string;
  type: AiFeatureType;
  eventId: string | null;
  vendorProfileId: string | null;
  quoteRequestId: string | null;
  input: unknown;
  output: unknown;
  aiMeta: AiMeta;
}
