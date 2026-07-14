// US-030 (PB-P1-018 / OBS-001) — Wiring de 4 eventos UX `task.status.quick_action.*`.
//   * `requested` — al `onMutate` tras el `setQueryData`.
//   * `succeeded` — al `onSuccess` con `latencyMs` y `idempotent?`.
//   * `failed`    — al `onError` con `errorCode` y `httpStatus`.
//   * `rolled_back` — explícito tras el `setQueryData(snapshot)` del rollback.
// Fallback: si `useTelemetryClient` (PB-P0-014) no existe, se emite `console.debug` cuando
// `process.env.NEXT_PUBLIC_EVENTFLOW_TELEMETRY_DEBUG === 'true'` (Tech Spec §17 risk mitigation).
// Payload SIN PII: nunca incluye `title`, `description`, `category_code` literal (SEC-05).
import type { CanonicalTaskStatus } from '../mutate/domain/taskStatusTransitions';
import type { QuickAction } from './compute-quick-actions';

export interface QuickActionTelemetryContext {
  eventId: string;
  taskId: string;
  fromStatus: CanonicalTaskStatus;
  toStatus: CanonicalTaskStatus;
  action: QuickAction;
  correlationId: string;
}

export interface QuickActionRequestedPayload extends QuickActionTelemetryContext {
  uiOrigin: 'quick_action';
}

export interface QuickActionSucceededPayload extends QuickActionRequestedPayload {
  latencyMs: number;
  idempotent?: boolean;
}

export interface QuickActionFailedPayload extends QuickActionRequestedPayload {
  errorCode: string;
  httpStatus: number;
  latencyMs: number;
}

export interface QuickActionRolledBackPayload extends QuickActionRequestedPayload {
  reason: 'mutation_error';
  errorCode: string;
}

type QuickActionEventName =
  | 'task.status.quick_action.requested'
  | 'task.status.quick_action.succeeded'
  | 'task.status.quick_action.failed'
  | 'task.status.quick_action.rolled_back';

type QuickActionEventPayload =
  | QuickActionRequestedPayload
  | QuickActionSucceededPayload
  | QuickActionFailedPayload
  | QuickActionRolledBackPayload;

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  'title',
  'description',
  'note',
  'organizer_email',
  'organizer_phone',
  'category_code',
]);

function assertNoPii(payload: unknown): void {
  if (!payload || typeof payload !== 'object') return;
  for (const key of Object.keys(payload as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) {
      // Falla loud en dev; se ignora silenciosamente en prod para no perder telemetría.
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(`Quick-action telemetry payload contains forbidden PII key: ${key}`);
      }
    }
  }
}

function debugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_EVENTFLOW_TELEMETRY_DEBUG === 'true';
}

function emit(name: QuickActionEventName, payload: QuickActionEventPayload): void {
  assertNoPii(payload);
  // Fallback: sin cliente real, solo debug opcional. PB-P0-014 conectará el transporte real.
  if (debugEnabled()) {
    // eslint-disable-next-line no-console
    console.debug('[telemetry]', name, payload);
  }
}

export function makeQuickActionTelemetry(ctx: QuickActionTelemetryContext) {
  const requestedPayload: QuickActionRequestedPayload = { ...ctx, uiOrigin: 'quick_action' };
  return {
    emitRequested(): void {
      emit('task.status.quick_action.requested', requestedPayload);
    },
    emitSucceeded(latencyMs: number, idempotent?: boolean): void {
      const payload: QuickActionSucceededPayload = {
        ...requestedPayload,
        latencyMs,
        ...(idempotent !== undefined ? { idempotent } : {}),
      };
      emit('task.status.quick_action.succeeded', payload);
    },
    emitFailed(errorCode: string, httpStatus: number, latencyMs: number): void {
      const payload: QuickActionFailedPayload = {
        ...requestedPayload,
        errorCode,
        httpStatus,
        latencyMs,
      };
      emit('task.status.quick_action.failed', payload);
    },
    emitRolledBack(errorCode: string): void {
      const payload: QuickActionRolledBackPayload = {
        ...requestedPayload,
        reason: 'mutation_error',
        errorCode,
      };
      emit('task.status.quick_action.rolled_back', payload);
    },
  };
}
