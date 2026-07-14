// US-029 (PB-P1-018 / BE-001) — Servicio puro de state machine para EventTask (Tech Spec §7).
// Transiciones canónicas (FR-TASK-004, BR-TASK-004, C-027):
//   pending      → { in_progress, done, skipped }
//   in_progress  → {              done, skipped }
//   done         → {} (terminal)
//   skipped      → {} (terminal)
// Transición a sí mismo → isSameState=true (idempotente; el use case responde 200 no_op).
// Nota: el enum físico (Prisma) incluye `active` sembrado por US-031 pero NO participa en el
// state machine canónico de US-029 (§Alignment N4). Cualquier envío de `active` al PATCH status
// es filtrado por Zod en BE-002 (`.enum(['pending','in_progress','done','skipped'])`).

export type CanonicalEventTaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped';

export interface InvalidTransitionDetail {
  current: CanonicalEventTaskStatus;
  requested: CanonicalEventTaskStatus;
  allowed: CanonicalEventTaskStatus[];
}

export class InvalidTransitionError extends Error {
  readonly current: CanonicalEventTaskStatus;
  readonly requested: CanonicalEventTaskStatus;
  readonly allowed: CanonicalEventTaskStatus[];
  constructor(current: CanonicalEventTaskStatus, requested: CanonicalEventTaskStatus, allowed: CanonicalEventTaskStatus[]) {
    super(`Invalid transition from '${current}' to '${requested}'`);
    this.current = current;
    this.requested = requested;
    this.allowed = allowed;
  }
}

/** Constante compartida cliente/servidor para evitar drift (Tech Spec §17 risk). */
export const TaskStatusTransitionsTable: Readonly<Record<CanonicalEventTaskStatus, readonly CanonicalEventTaskStatus[]>> =
  Object.freeze({
    pending: Object.freeze(['in_progress', 'done', 'skipped'] as const),
    in_progress: Object.freeze(['done', 'skipped'] as const),
    done: Object.freeze([] as const),
    skipped: Object.freeze([] as const),
  });

export class EventTaskStateMachineService {
  allowedTransitionsFrom(status: CanonicalEventTaskStatus): CanonicalEventTaskStatus[] {
    return [...(TaskStatusTransitionsTable[status] ?? [])];
  }

  isSameState(from: CanonicalEventTaskStatus, to: CanonicalEventTaskStatus): boolean {
    return from === to;
  }

  assertCanTransition(from: CanonicalEventTaskStatus, to: CanonicalEventTaskStatus): void {
    if (from === to) return; // same-state idempotente; el caller decide no aplicar UPDATE
    const allowed = this.allowedTransitionsFrom(from);
    if (!allowed.includes(to)) {
      throw new InvalidTransitionError(from, to, allowed);
    }
  }
}
