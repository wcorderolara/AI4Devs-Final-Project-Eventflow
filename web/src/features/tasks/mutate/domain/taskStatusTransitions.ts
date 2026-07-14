// US-029 (PB-P1-018 / FE-002) — Constante compartida cliente para el state machine (Tech Spec §17).
// Refleja `TaskStatusTransitionsTable` del backend (`EventTaskStateMachineService`). Debe
// mantenerse en sync con `backend/src/modules/task-management/mutate/domain/EventTaskStateMachineService.ts`.
// Un test E2E (QA-007) valida la coherencia contra el backend.
export type CanonicalTaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped';

export const TASK_STATUS_TRANSITIONS: Readonly<
  Record<CanonicalTaskStatus, readonly CanonicalTaskStatus[]>
> = Object.freeze({
  pending: Object.freeze(['in_progress', 'done', 'skipped'] as const),
  in_progress: Object.freeze(['done', 'skipped'] as const),
  done: Object.freeze([] as const),
  skipped: Object.freeze([] as const),
});

export function allowedTransitionsFrom(status: CanonicalTaskStatus): CanonicalTaskStatus[] {
  return [...(TASK_STATUS_TRANSITIONS[status] ?? [])];
}

/** Estados terminales para los que se muestra confirm dialog al transicionar (a11y + UX). */
export const TERMINAL_TASK_STATUSES: ReadonlySet<CanonicalTaskStatus> = new Set<CanonicalTaskStatus>([
  'done',
  'skipped',
]);
