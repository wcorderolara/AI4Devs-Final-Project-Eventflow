// Response DTO — POST /events/:eventId/ai/task-priority (US-024 / BE-006).
// Estructura contractual del tech spec §7: `ai_recommendation_id` (nullable en empty-state y
// fallback), `top`, `rationale_summary` opcional, `locale`, `locale_fallback`, `cache_hit`,
// `generated_at`. Snake case por espejo del contrato AI cliente.
import type { PrioritizeTasksView } from '../application/prioritize-tasks.us024.use-case.js';

export interface TaskPriorityItemResponse {
  task_id: string;
  reason: string;
  urgency_score: number;
}

export interface TaskPriorityResponse {
  ai_recommendation_id: string | null;
  top: TaskPriorityItemResponse[];
  rationale_summary: string | null;
  locale: string;
  locale_fallback: boolean;
  cache_hit: boolean;
  generated_at: string;
}

export function toTaskPriorityResponse(view: PrioritizeTasksView): TaskPriorityResponse {
  return {
    ai_recommendation_id: view.aiRecommendationId,
    top: view.top,
    rationale_summary: view.rationaleSummary,
    locale: view.locale,
    locale_fallback: view.localeFallback,
    cache_hit: view.cacheHit,
    generated_at: view.generatedAt.toISOString(),
  };
}
