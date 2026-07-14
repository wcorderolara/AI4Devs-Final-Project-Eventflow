// US-030 (PB-P1-018 / FE-001) — Helper puro que devuelve las acciones rápidas visibles + habilitadas
// para un par `(taskStatus, eventStatus)`. Sin dependencias de React/TanStack.
//
// Matriz canónica (Tech Spec §8):
//   * pending      → done | skipped
//   * in_progress  → done | skipped
//   * done         → in_progress (desmarcar)
//   * skipped      → in_progress (reanudar)
//
// La transición pending ↔ in_progress se cubre por `TaskStatusMenu` (US-029), NO aquí.
import type { CanonicalTaskStatus } from '../mutate/domain/taskStatusTransitions';

export type QuickAction = 'check_done' | 'uncheck_done' | 'skip' | 'resume';

export interface QuickActionMatrixRow {
  action: QuickAction;
  targetStatus: CanonicalTaskStatus;
  labelKey: string;
  ariaLabelKey: string;
  iconKey: string;
  /** true si la transición está permitida por el state machine + `eventStatus` mutable. */
  enabled: boolean;
}

export type EventMutabilityStatus = 'draft' | 'active' | 'completed' | 'cancelled';

const IMMUTABLE_EVENT_STATUSES: ReadonlySet<EventMutabilityStatus> = new Set<EventMutabilityStatus>([
  'cancelled',
  'completed',
]);

/**
 * Devuelve el listado de acciones rápidas disponibles para el par (taskStatus, eventStatus).
 * `enabled=false` cuando el evento está bloqueado o cuando el `task.status` no permite la
 * transición canónica. Si `taskStatus` no está en el flujo canónico (p. ej. `active` sembrado
 * por US-031) → array vacío (el consumidor cae al `TaskStatusMenu` de US-029).
 */
export function computeQuickActions(
  taskStatus: CanonicalTaskStatus | 'active',
  eventStatus: EventMutabilityStatus | undefined,
): QuickActionMatrixRow[] {
  const eventMutable = eventStatus === undefined || !IMMUTABLE_EVENT_STATUSES.has(eventStatus);

  if (taskStatus === 'pending') {
    return [
      makeRow('check_done', 'done', eventMutable),
      makeRow('skip', 'skipped', eventMutable),
    ];
  }
  if (taskStatus === 'in_progress') {
    return [
      makeRow('check_done', 'done', eventMutable),
      makeRow('skip', 'skipped', eventMutable),
    ];
  }
  if (taskStatus === 'done') {
    return [makeRow('uncheck_done', 'in_progress', eventMutable)];
  }
  if (taskStatus === 'skipped') {
    return [makeRow('resume', 'in_progress', eventMutable)];
  }
  // 'active' u otros: sin acciones rápidas canónicas.
  return [];
}

function makeRow(
  action: QuickAction,
  targetStatus: CanonicalTaskStatus,
  enabled: boolean,
): QuickActionMatrixRow {
  return {
    action,
    targetStatus,
    labelKey: `tasks.status.quick_action.label.${action}`,
    ariaLabelKey: `tasks.status.quick_action.aria.${action}`,
    iconKey: `tasks.status.quick_action.icon.${action}`,
    enabled,
  };
}
