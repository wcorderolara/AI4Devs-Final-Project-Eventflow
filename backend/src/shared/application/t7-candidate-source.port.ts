// US-034 (PB-P2-004 / BE-003). Puerto `T7CandidateSource` — provee los candidatos T-7
// al `EmitT7NotificationsUseCase`. Vive en `shared/application/` para preservar
// `boundaries/element-types` (ADR-ARCH-001): el consumidor `notifications` y el
// productor `task-management` NO pueden importarse mutuamente; el puerto en `shared`
// es la superficie común.
//
// Filtros SQL que el adapter DEBE aplicar (tech spec §7):
//   * `events.status = 'active'`
//   * `event_tasks.status IN ('pending','in_progress')`
//   * `event_tasks.due_date IS NOT NULL`
//   * `event_tasks.due_date::date = $targetDate::date`
//   * `event_tasks.deleted_at IS NULL`

/** Fila proyectada por chunk — sólo columnas requeridas por el use case. */
export interface T7CandidateRow {
  taskId: string;
  eventId: string;
  ownerUserId: string;
  /**
   * Idioma default del evento (enum Prisma serializado, ej. `es_LATAM`). Fallback
   * si el usuario no tiene `preferredLanguage`. El UC normaliza a `SupportedLanguage`.
   */
  eventLanguage: string;
  /** ISO date `YYYY-MM-DD`. Persistido tal cual en `payload.dueDate`. */
  dueDate: string;
}

export interface FindT7CandidatesInput {
  /** Día calendario objetivo (T-7). Se compara con `event_task.due_date::date`. */
  targetDate: Date;
  /** Tamaño máximo de chunk. Ordenado por `(event_id, task_id)` para determinismo. */
  batchSize: number;
  /** Offset del chunk. El use case incrementa hasta que `findT7Candidates` retorne < batchSize. */
  offset: number;
}

export interface T7CandidateSourcePort {
  findT7Candidates(input: FindT7CandidatesInput): Promise<T7CandidateRow[]>;
}
