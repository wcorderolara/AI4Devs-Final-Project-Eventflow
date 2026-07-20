'use client';

// Hooks TanStack — admin event types (US-076 / FE-004). Mutations invalidan la lista.
// Además propagan a `['events', 'event-types']` (US-009 `useEventTypes` consumido por
// el wizard de creación de eventos) para que consumers públicos vean el catálogo
// actualizado tras cambios admin.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminEventTypesApi } from '../api/adminEventTypesApi';
import type {
  AdminEventTypeNode,
  AdminEventTypesListDTO,
  CreateEventTypeBodyDTO,
  DeleteEventTypeBodyDTO,
  UpdateEventTypeBodyDTO,
} from '../api/adminEventTypesApi.types';
import type { ApiError } from '@/shared/api-client';

export const adminEventTypesKeys = {
  all: ['admin', 'event-types'] as const,
  list: () => ['admin', 'event-types', 'list'] as const,
} as const;

/** Prefijos externos que también deben invalidarse cuando el catálogo cambia. */
const PUBLIC_EVENT_TYPES_QUERY_KEYS: readonly (readonly unknown[])[] = [
  ['events', 'event-types'],
];

function invalidatePublic(qc: ReturnType<typeof useQueryClient>): void {
  for (const key of PUBLIC_EVENT_TYPES_QUERY_KEYS) {
    void qc.invalidateQueries({ queryKey: key });
  }
}

export function useAdminEventTypesList(enabled = true) {
  return useQuery<AdminEventTypesListDTO, ApiError>({
    queryKey: adminEventTypesKeys.list(),
    queryFn: () => adminEventTypesApi.list(),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateEventType() {
  const qc = useQueryClient();
  return useMutation<AdminEventTypeNode, ApiError, CreateEventTypeBodyDTO>({
    mutationFn: (body) => adminEventTypesApi.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminEventTypesKeys.all });
      invalidatePublic(qc);
    },
  });
}

export interface UpdateEventTypeInput extends UpdateEventTypeBodyDTO {
  id: string;
}

export function useUpdateEventType() {
  const qc = useQueryClient();
  return useMutation<AdminEventTypeNode, ApiError, UpdateEventTypeInput>({
    mutationFn: ({ id, ...body }) => adminEventTypesApi.update(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminEventTypesKeys.all });
      invalidatePublic(qc);
    },
  });
}

export interface DeleteEventTypeInput extends DeleteEventTypeBodyDTO {
  id: string;
}

export function useDeleteEventType() {
  const qc = useQueryClient();
  return useMutation<AdminEventTypeNode, ApiError, DeleteEventTypeInput>({
    mutationFn: ({ id, reason }) => adminEventTypesApi.softDelete(id, { reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminEventTypesKeys.all });
      invalidatePublic(qc);
    },
  });
}
