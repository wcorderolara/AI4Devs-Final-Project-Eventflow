'use client';

// US-029 (PB-P1-018 / FE-004) — 3 hooks TanStack para las mutaciones.
//   * `useUpdateEventTaskContent(eventId)`.
//   * `useUpdateEventTaskStatus(eventId)`.
//   * `useDeleteEventTask(eventId)`.
// `onSuccess`:
//   * PATCH: `setQueryData` para actualizar la fila in-place en la primera página + invalidate.
//   * DELETE: `setQueryData` elimina la fila localmente + invalidate.
// `onError`: no rollback aquí (el modal/menu maneja el estado UI y llama refetch).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksMutateApi } from '../api/tasksMutateApi';
import { eventTasksKeys } from '../../list/hooks/useEventTasks';
import type { TaskListItemDTO, TaskListResult } from '../../list/api/tasksListApi.types';
import type { CanonicalTaskStatus } from '../domain/taskStatusTransitions';

function patchItemInFirstPage(
  queryClient: ReturnType<typeof useQueryClient>,
  eventId: string,
  updated: TaskListItemDTO,
): void {
  const key = eventTasksKeys.list({ eventId, page: 1, pageSize: 20 });
  const prev = queryClient.getQueryData<TaskListResult>(key);
  if (!prev) return;
  const nextItems = prev.items.map((i) => (i.id === updated.id ? updated : i));
  queryClient.setQueryData<TaskListResult>(key, {
    items: nextItems,
    pagination: prev.pagination,
  });
}

function removeItemInFirstPage(
  queryClient: ReturnType<typeof useQueryClient>,
  eventId: string,
  taskId: string,
): void {
  const key = eventTasksKeys.list({ eventId, page: 1, pageSize: 20 });
  const prev = queryClient.getQueryData<TaskListResult>(key);
  if (!prev) return;
  const nextItems = prev.items.filter((i) => i.id !== taskId);
  const nextTotal = Math.max(0, prev.pagination.total - 1);
  const pageSize = prev.pagination.pageSize;
  queryClient.setQueryData<TaskListResult>(key, {
    items: nextItems,
    pagination: {
      ...prev.pagination,
      total: nextTotal,
      totalPages: Math.max(1, Math.ceil(nextTotal / pageSize)),
    },
  });
}

export interface UpdateContentVariables {
  taskId: string;
  body: Parameters<typeof tasksMutateApi.updateContent>[2];
}

export function useUpdateEventTaskContent(
  eventId: string,
): ReturnType<typeof useMutation<TaskListItemDTO, Error, UpdateContentVariables>> {
  const queryClient = useQueryClient();
  return useMutation<TaskListItemDTO, Error, UpdateContentVariables>({
    mutationFn: ({ taskId, body }) => tasksMutateApi.updateContent(eventId, taskId, body),
    onSuccess: (updated) => {
      patchItemInFirstPage(queryClient, eventId, updated);
      void queryClient.invalidateQueries({ queryKey: eventTasksKeys.root(eventId) });
    },
  });
}

export interface UpdateStatusVariables {
  taskId: string;
  status: CanonicalTaskStatus;
}

export function useUpdateEventTaskStatus(
  eventId: string,
): ReturnType<typeof useMutation<TaskListItemDTO, Error, UpdateStatusVariables>> {
  const queryClient = useQueryClient();
  return useMutation<TaskListItemDTO, Error, UpdateStatusVariables>({
    mutationFn: ({ taskId, status }) => tasksMutateApi.updateStatus(eventId, taskId, status),
    onSuccess: (updated) => {
      patchItemInFirstPage(queryClient, eventId, updated);
      void queryClient.invalidateQueries({ queryKey: eventTasksKeys.root(eventId) });
    },
  });
}

export interface DeleteVariables {
  taskId: string;
}

export function useDeleteEventTask(
  eventId: string,
): ReturnType<typeof useMutation<void, Error, DeleteVariables>> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, DeleteVariables>({
    mutationFn: ({ taskId }) => tasksMutateApi.delete(eventId, taskId),
    onSuccess: (_v, vars) => {
      removeItemInFirstPage(queryClient, eventId, vars.taskId);
      void queryClient.invalidateQueries({ queryKey: eventTasksKeys.root(eventId) });
    },
  });
}
