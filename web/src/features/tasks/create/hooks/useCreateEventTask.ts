'use client';

// US-028 (PB-P1-018 / FE-003) — Hook TanStack para la mutación de creación.
// `onSuccess`:
//   1. `setQueryData` en la primera página del listado sin filtros para inyectar la nueva fila
//      al inicio (optimistic UX).
//   2. `invalidateQueries(['events', eventId, 'tasks'])` para refrescar conteos y páginas.
// El botón "Crear" queda deshabilitado durante `isPending` (mitigación doble submit TS-09).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksCreateApi, type CreateEventTaskPayload } from '../api/tasksCreateApi';
import { eventTasksKeys } from '../../list/hooks/useEventTasks';
import type { TaskListItemDTO, TaskListResult } from '../../list/api/tasksListApi.types';

export function useCreateEventTask(eventId: string): ReturnType<
  typeof useMutation<TaskListItemDTO, Error, CreateEventTaskPayload>
> {
  const queryClient = useQueryClient();
  return useMutation<TaskListItemDTO, Error, CreateEventTaskPayload>({
    mutationFn: (body) => tasksCreateApi.create(eventId, body),
    onSuccess: (newTask) => {
      // Inyección optimista sólo en el key SIN filtros aplicados (primera página, pageSize 20).
      const key = eventTasksKeys.list({ eventId, page: 1, pageSize: 20 });
      const prev = queryClient.getQueryData<TaskListResult>(key);
      if (prev) {
        const nextItems = [newTask, ...prev.items].slice(0, prev.pagination.pageSize);
        queryClient.setQueryData<TaskListResult>(key, {
          items: nextItems,
          pagination: {
            ...prev.pagination,
            total: prev.pagination.total + 1,
            totalPages: Math.max(1, Math.ceil((prev.pagination.total + 1) / prev.pagination.pageSize)),
          },
        });
      }
      void queryClient.invalidateQueries({ queryKey: eventTasksKeys.root(eventId) });
    },
  });
}
