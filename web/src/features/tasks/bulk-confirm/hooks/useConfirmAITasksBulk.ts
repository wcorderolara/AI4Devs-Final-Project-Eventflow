'use client';

// US-031 (PB-P1-017 / FE-004) — Hook TanStack Query para el bulk confirm HITL.
// Al éxito invalida las queries de la lista de tareas + la sublista IA-pending para forzar refetch.
// Devuelve el `ConfirmAITasksBulkResponse` completo para que el consumidor renderice el
// `BulkResultBanner` con el desglose por `error.code`.
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import {
  tasksBulkApi,
  type ConfirmAITasksBulkResponse,
} from '../api/tasksBulkApi';

interface UseConfirmBulkArgs {
  eventId: string;
  invalidateQueryKeys?: QueryKey[];
}

interface ConfirmBulkVars {
  taskIds: string[];
}

export function useConfirmAITasksBulk(
  args: UseConfirmBulkArgs,
): ReturnType<typeof useMutation<ConfirmAITasksBulkResponse, ApiError, ConfirmBulkVars>> {
  const qc = useQueryClient();
  const defaultKeys: QueryKey[] = [
    ['events', args.eventId, 'tasks'],
    ['events', args.eventId, 'tasks', 'ai-pending'],
  ];
  return useMutation<ConfirmAITasksBulkResponse, ApiError, ConfirmBulkVars>({
    mutationFn: ({ taskIds }) => tasksBulkApi.confirmBulk(args.eventId, taskIds),
    onSuccess: () => {
      for (const key of args.invalidateQueryKeys ?? defaultKeys) {
        void qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}
