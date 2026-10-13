// Cliente genérico de los generadores IA por evento (US-017..US-021 / FE-001).
// Contrato: POST /api/v1/events/:eventId/ai/<feature> con envelope success (Doc 15 §23).
// Auth por cookie HTTP-Only (credentials: 'include' vía httpClient). Nunca invoca el LLM directo (SEC-04).
import { httpPostData } from '@/shared/api-client';

/** Metadatos de la ejecución IA que acompañan a cada recomendación generada. */
export interface AIMeta {
  provider: string;
  promptVersion?: string;
  latencyMs?: number;
  fallbackUsed?: boolean;
  languageCode?: string;
}

export interface AIGenerationResponse<O> {
  recommendationId: string;
  type: string;
  status: string;
  output: O;
  aiMeta: AIMeta;
  createdAt: string;
}

export interface AIGenerationRequest<I> {
  input: I;
  languageCode?: string;
  preferMock?: boolean;
}

export interface AIGenerator<I, O> {
  generate(eventId: string, body: AIGenerationRequest<I>): Promise<AIGenerationResponse<O>>;
}

/**
 * Timeout de cliente 65s (mayor que los 60s del backend, Decisión PO 8.1 #9). El backend valida
 * ownership, aplica rate limit SEC-POL-AI-007 y persiste `AIRecommendation` con status `pending`
 * (HITL).
 */
export function createAIGenerator<I, O>(feature: string): AIGenerator<I, O> {
  return {
    generate(eventId, body) {
      return httpPostData<AIGenerationResponse<O>, AIGenerationRequest<I>>(
        `/events/${eventId}/ai/${feature}`,
        { body, isAI: true, timeoutMs: 65_000 },
      );
    },
  };
}
