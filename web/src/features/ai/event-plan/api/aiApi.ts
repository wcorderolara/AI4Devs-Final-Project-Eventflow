// Cliente API de la feature AI Event Plan (US-017 / FE-001).
// Contrato: POST /api/v1/events/:eventId/ai/event-plan con envelope success (Doc 15 §23).
// Auth por cookie HTTP-Only (credentials: 'include' vía httpClient). Nunca invoca el LLM directo (SEC-04).
import {
  createAIGenerator,
  type AIGenerationResponse,
} from '@/features/ai/shared/api/createAIGenerator';

export interface EventPlanPhase {
  name: string;
  tasks: string[];
}

export interface EventPlanOutput {
  summary: string;
  phases: EventPlanPhase[];
}

export type GenerateEventPlanResponse = AIGenerationResponse<EventPlanOutput>;

export interface EventPlanInput {
  eventTypeCode?: string;
  eventDate?: string;
  guestCount?: number;
  budgetEstimated?: string | number;
  currencyCode?: string;
  city?: string;
}

/**
 * US-017 / AC-01: genera el plan IA de un evento. Timeout de cliente 65s (mayor que los 60s del
 * backend, Decisión PO 8.1 #9). El backend valida ownership, aplica rate limit SEC-POL-AI-007 y
 * persiste `AIRecommendation` con status `pending` (HITL — AC-04).
 */
export const aiEventPlanApi = createAIGenerator<EventPlanInput, EventPlanOutput>('event-plan');
