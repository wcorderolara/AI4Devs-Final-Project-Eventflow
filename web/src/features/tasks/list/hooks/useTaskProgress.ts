'use client';

// US-033 (PB-P1-019 / FE-003) — Selector liviano del agregado `progress` que reusa el mismo
// query key canónico de `useEventTasks` (['events', eventId, 'tasks', {range,page,pageSize,...}])
// para NO disparar un segundo fetch. La invalidación existente de US-029/US-030/US-031
// (`queryClient.invalidateQueries({ queryKey: ['events', eventId, 'tasks'] })`) refresca el
// progreso automáticamente (AC-02).
//
// Ancla al slot canónico `{page:1, pageSize:1, range:'all', status:null, aiGenerated:null,
// categoryCode:null}`: cualquier vista que necesite el % SIN el listado (por ejemplo, el
// dashboard) comparte cache con ese slot mínimo — un solo GET adicional por sesión y luego
// puros cache hits mientras dure `staleTime` o hasta invalidación.
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { tasksListApi } from '../api/tasksListApi';
import { eventTasksKeys } from './useEventTasks';
import type { TaskListResult, TaskProgressDTO } from '../api/tasksListApi.types';

const DEFAULT_PROGRESS: TaskProgressDTO = {
  percentage: 0,
  done: 0,
  total_countable: 0,
  skipped: 0,
};

export function useTaskProgress(eventId: string): {
  data: TaskProgressDTO | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const params = { eventId, page: 1, pageSize: 1, range: 'all' as const };
  const q = useQuery<TaskListResult, Error, TaskProgressDTO>({
    queryKey: eventTasksKeys.list(params),
    queryFn: () => tasksListApi.list(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: false,
    // El `select` mantiene la referencia estable mientras `progress` no cambie.
    select: (data) => data.progress ?? DEFAULT_PROGRESS,
  });
  return { data: q.data, isLoading: q.isLoading, isError: q.isError };
}
