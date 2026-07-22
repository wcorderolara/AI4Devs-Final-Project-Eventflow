// Cliente API — AI Task Priority (US-024 / FE-002).
//   POST /api/v1/events/:eventId/ai/task-priority — genera el top 3.
// El backend aplica cache signature 5min server-side; el cliente no necesita conocer la signature
// (el hook simplemente vuelve a llamar para regenerar y el backend responde cache_hit=true si
// nada cambió, o cache_hit=false si el checklist mutó).
import { httpPost } from '@/shared/api-client';

export interface TaskPriorityItem {
  task_id: string;
  reason: string;
  urgency_score: number;
}

export interface GenerateTaskPriorityResponse {
  ai_recommendation_id: string | null;
  top: TaskPriorityItem[];
  rationale_summary: string | null;
  locale: string;
  locale_fallback: boolean;
  cache_hit: boolean;
  generated_at: string;
}

export interface GenerateTaskPriorityInput {
  eventId: string;
  preferMock?: boolean;
}

interface TaskPriorityEnvelope {
  data: GenerateTaskPriorityResponse;
  meta: { correlationId: string; timestamp: string };
}

export const aiTaskPriorityApi = {
  /**
   * US-024 / AC-01: genera el top 3 IA para el checklist del evento. Timeout del cliente 65s
   * para tolerar el cap 60s del provider AI + margen de red.
   */
  async generate(input: GenerateTaskPriorityInput): Promise<GenerateTaskPriorityResponse> {
    const envelope = await httpPost<TaskPriorityEnvelope, { preferMock?: boolean }>(
      `/events/${input.eventId}/ai/task-priority`,
      {
        body: { preferMock: input.preferMock },
        isAI: true,
        timeoutMs: 65_000,
      },
    );
    return envelope.data;
  },
};
