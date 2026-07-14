'use client';

// US-027 (PB-P1-018 / FE-001) — Hook TanStack Query del listado del checklist.
// `queryKey: ['events', eventId, 'tasks', filters, page, pageSize]` — cache alineado con la
// invalidación de US-028..031. `placeholderData: keepPreviousData` evita parpadeo al paginar.
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { tasksListApi } from '../api/tasksListApi';
import type { ListTasksParams, TaskListResult } from '../api/tasksListApi.types';

export const eventTasksKeys = {
  root: (eventId: string) => ['events', eventId, 'tasks'] as const,
  list: (params: ListTasksParams) =>
    [
      'events',
      params.eventId,
      'tasks',
      {
        status: params.status ?? null,
        aiGenerated: params.aiGenerated ?? null,
        categoryCode: params.categoryCode ?? null,
        // US-032 (FE-002): `range` en la cache key → cambio de toggle dispara refetch
        // automático. `undefined` se normaliza a `null` para estabilidad de la key.
        range: params.range ?? null,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      },
    ] as const,
};

export function useEventTasks(
  params: ListTasksParams,
): ReturnType<typeof useQuery<TaskListResult, Error>> {
  return useQuery<TaskListResult, Error>({
    queryKey: eventTasksKeys.list(params),
    queryFn: () => tasksListApi.list(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: false,
  });
}
