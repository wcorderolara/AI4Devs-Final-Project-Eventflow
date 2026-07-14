// Cliente API de la feature AI Event Plan (US-017 / FE-001).
// Contrato: POST /api/v1/events/:eventId/ai/event-plan con envelope success (Doc 15 §23).
// Auth por cookie HTTP-Only (credentials: 'include' vía httpClient). Nunca invoca el LLM directo (SEC-04).
import { httpPost } from '@/shared/api-client';

export interface EventPlanPhase {
  name: string;
  tasks: string[];
}

export interface EventPlanOutput {
  summary: string;
  phases: EventPlanPhase[];
}

export interface EventPlanAiMeta {
  provider: string;
  promptVersion?: string;
  latencyMs?: number;
  fallbackUsed?: boolean;
  languageCode?: string;
}

export interface GenerateEventPlanResponse {
  recommendationId: string;
  type: string;
  status: string;
  output: EventPlanOutput;
  aiMeta: EventPlanAiMeta;
  createdAt: string;
}

export interface EventPlanInput {
  eventTypeCode?: string;
  eventDate?: string;
  guestCount?: number;
  budgetEstimated?: string | number;
  currencyCode?: string;
  city?: string;
}

interface GenerateEventPlanRequest {
  input: EventPlanInput;
  languageCode?: string;
  preferMock?: boolean;
}

interface EventPlanEnvelope {
  data: GenerateEventPlanResponse;
  meta: { correlationId: string; timestamp: string };
}

export const aiEventPlanApi = {
  /**
   * US-017 / AC-01: genera el plan IA de un evento. Timeout de cliente 65s (mayor que los 60s del
   * backend, Decisión PO 8.1 #9). El backend valida ownership, aplica rate limit SEC-POL-AI-007 y
   * persiste `AIRecommendation` con status `pending` (HITL — AC-04).
   */
  async generate(
    eventId: string,
    body: GenerateEventPlanRequest,
  ): Promise<GenerateEventPlanResponse> {
    const dto = await httpPost<EventPlanEnvelope, GenerateEventPlanRequest>(
      `/events/${eventId}/ai/event-plan`,
      { body, isAI: true, timeoutMs: 65_000 },
    );
    return dto.data;
  },
};
