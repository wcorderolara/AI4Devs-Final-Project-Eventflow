'use client';

// US-030 (PB-P1-018 / FE-004) — Wrapper `useQuickActionStatusMutation`.
// Composable sobre `useUpdateEventTaskStatus` (US-029) + snapshot/rollback + 4 eventos UX.
//
// Reglas canónicas (Tech Spec §8 Wrapper):
//   1. onMutate: `await queryClient.cancelQueries` → snapshot deep-clone → `setQueryData` con
//      `rewriteTaskStatus` → emitir `requested`. Devuelve `{ snapshot, requestedAt }`.
//   2. onSuccess: `setQueryData` con `TaskListItemDto` recibido; emitir `succeeded` con
//      `latencyMs` y `idempotent` cuando aplica.
//   3. onError: `setQueryData(snapshot)`; emitir `failed` + `rolled_back`; devolver mapping para
//      que el componente muestre el Toast.
//   4. onSettled: `invalidateQueries(['events', eventId, 'tasks'])`.
//
// El helper `structuredClone` está disponible en navegador moderno (Node 17+); si no, fallback
// con `JSON.parse(JSON.stringify(...))` para runtimes de test antiguos.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { tasksMutateApi } from '../mutate/api/tasksMutateApi';
import type { CanonicalTaskStatus } from '../mutate/domain/taskStatusTransitions';
import { eventTasksKeys } from '../list/hooks/useEventTasks';
import type {
  TaskListItemDTO,
  TaskListItemStatus,
  TaskListResult,
} from '../list/api/tasksListApi.types';
import { rewriteTaskStatus } from './rewrite-task-status';
import { quickActionErrorMap, type QuickActionErrorMapping } from './quick-action-error-map';
import {
  makeQuickActionTelemetry,
  type QuickActionTelemetryContext,
} from './telemetry';
import type { QuickAction } from './compute-quick-actions';

export interface QuickActionMutationVariables {
  taskId: string;
  fromStatus: CanonicalTaskStatus;
  toStatus: CanonicalTaskStatus;
  action: QuickAction;
  correlationId?: string;
}

export interface QuickActionMutationContext {
  snapshot: TaskListResult | undefined;
  startedAt: number;
  ctx: QuickActionTelemetryContext;
  telemetry: ReturnType<typeof makeQuickActionTelemetry>;
}

export interface QuickActionMutationError {
  raw: unknown;
  mapping: QuickActionErrorMapping;
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback determinista simple; solo se usa cuando no hay crypto disponible.
  return `qa_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

export function useQuickActionStatusMutation(
  eventId: string,
): UseMutationResult<
  TaskListItemDTO,
  QuickActionMutationError,
  QuickActionMutationVariables,
  QuickActionMutationContext
> {
  const queryClient = useQueryClient();
  const rootKey = eventTasksKeys.root(eventId);
  const firstPageKey = eventTasksKeys.list({ eventId, page: 1, pageSize: 20 });

  return useMutation<
    TaskListItemDTO,
    QuickActionMutationError,
    QuickActionMutationVariables,
    QuickActionMutationContext
  >({
    mutationFn: async ({ taskId, toStatus }) => {
      return tasksMutateApi.updateStatus(eventId, taskId, toStatus);
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: rootKey });
      const prev = queryClient.getQueryData<TaskListResult>(firstPageKey);
      const snapshot = prev ? deepClone(prev) : undefined;

      if (prev) {
        queryClient.setQueryData<TaskListResult>(firstPageKey, {
          items: rewriteTaskStatus(prev.items, vars.taskId, vars.toStatus as TaskListItemStatus),
          pagination: prev.pagination,
        });
      }

      const ctx: QuickActionTelemetryContext = {
        eventId,
        taskId: vars.taskId,
        fromStatus: vars.fromStatus,
        toStatus: vars.toStatus,
        action: vars.action,
        correlationId: vars.correlationId ?? generateCorrelationId(),
      };
      const telemetry = makeQuickActionTelemetry(ctx);
      telemetry.emitRequested();

      return { snapshot, startedAt: Date.now(), ctx, telemetry };
    },
    onSuccess: (dto, vars, context) => {
      if (context) {
        // Sustituye la fila con el DTO fresh recibido.
        const key = firstPageKey;
        const prev = queryClient.getQueryData<TaskListResult>(key);
        if (prev) {
          const nextItems = prev.items.map((i) => (i.id === dto.id ? dto : i));
          queryClient.setQueryData<TaskListResult>(key, {
            items: nextItems,
            pagination: prev.pagination,
          });
        }
        const latencyMs = Date.now() - context.startedAt;
        // idempotent same-state: US-029 responde 200 con la fila sin cambios materiales.
        const idempotent = vars.fromStatus === vars.toStatus;
        context.telemetry.emitSucceeded(latencyMs, idempotent || undefined);
      }
    },
    onError: (rawError, _vars, context) => {
      const mapping = quickActionErrorMap(rawError);
      if (context) {
        if (context.snapshot) {
          queryClient.setQueryData<TaskListResult>(firstPageKey, context.snapshot);
        }
        const latencyMs = Date.now() - context.startedAt;
        const rawUnknown = rawError as unknown as { status?: number };
        const httpStatus = typeof rawUnknown.status === 'number' ? rawUnknown.status : 0;
        context.telemetry.emitFailed(mapping.errorCode, httpStatus, latencyMs);
        context.telemetry.emitRolledBack(mapping.errorCode);
      }
      // Guardamos el mapping enriquecido en el error para que el componente lo extraiga sin
      // duplicar la clasificación. Se hace vía cast `unknown` — el shape de ApiError permite
      // agregar atributos custom sin romper el contrato público.
      (rawError as unknown as Record<string, unknown>).__quickActionMapping = mapping;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: rootKey });
    },
  });
}

/** Extrae el mapping enriquecido colocado en `onError` (o computa uno on-the-fly). */
export function extractErrorMapping(error: unknown): QuickActionErrorMapping {
  const cached = (error as { __quickActionMapping?: QuickActionErrorMapping })?.__quickActionMapping;
  if (cached) return cached;
  return quickActionErrorMap(error);
}
