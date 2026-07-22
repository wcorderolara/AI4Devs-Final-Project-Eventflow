// US-024 (PB-P2-002) / BE-005 — Reader de tareas elegibles para priorización IA.
//
// "Elegible" (D3, alineado con el schema real — deviation D-03 del execution record):
//   deleted_at IS NULL
//   AND status IN ('pending','active','in_progress')
//   AND (ai_generated = false OR confirmed_by_user_id IS NOT NULL)
//
// `active` se incluye como estado operativo intermedio del bulk-confirm HITL de US-031.
// El schema real no tiene columna `priority` en EventTask — el use case usa la posición
// relativa por `dueDate ASC NULLS LAST` como señal implícita.
//
// Es consumer-owned dentro de `ai-assistance`; el adapter Prisma vive en `infrastructure/`.
export interface EligibleTaskRow {
  id: string;
  title: string;
  dueDate: Date | null;
  status: 'pending' | 'active' | 'in_progress';
  updatedAt: Date;
}

export interface EligibleTasksReader {
  findEligibleByEventId(eventId: string): Promise<EligibleTaskRow[]>;
}
