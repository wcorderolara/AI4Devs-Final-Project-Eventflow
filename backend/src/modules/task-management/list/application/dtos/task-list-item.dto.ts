// US-027 (PB-P1-018 / BE-001) — DTO canónico del listado de tareas del evento.
// Expone SOLO metadata de trazabilidad IA mínima (BR-AI-010, AC-07): ni `prompt_version_id`,
// ni `llm_provider`, ni el payload original del LLM. El status permitido incluye `active` para
// alinearse con el enum físico introducido por US-031; los cuatro estados canónicos de la US
// (pending/in_progress/done/skipped) se preservan verbatim.
export type TaskListItemStatus =
  | 'pending'
  | 'active'
  | 'in_progress'
  | 'done'
  | 'skipped';

export interface TaskListItemDto {
  id: string;
  title: string;
  due_date: string | null;
  status: TaskListItemStatus;
  category_code: string | null;
  ai_generated: boolean;
  ai_recommendation_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  // US-032 (PB-P1-019 / BE-002) — Flags temporales derivados server-side (AC-01..03, AC-08).
  // Invariantes:
  //   `overdue = due_date < CURRENT_DATE AND status NOT IN ('done','skipped') AND due_date IS NOT NULL`
  //   `is_t_minus_7 = due_date ∈ [CURRENT_DATE, CURRENT_DATE + 7d] AND due_date IS NOT NULL`
  // Cuando `due_date IS NULL`, ambos valen `false` (EC-07). Son booleanos NO opcionales del contrato.
  overdue: boolean;
  is_t_minus_7: boolean;
}
