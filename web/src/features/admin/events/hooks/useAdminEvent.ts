'use client';

// US-016 / FE-001 — Hook TanStack Query para el detalle admin de un evento.
import { useQuery } from '@tanstack/react-query';
import { adminEventsApi } from '../api/adminEventsApi';
import type { AdminEventModel } from '../api/adminEventsApi.types';

export const adminEventsKeys = {
  all: ['admin', 'events'] as const,
  detail: (id: string) => ['admin', 'events', 'detail', id] as const,
};

/** US-016 / AC-01: obtiene el detalle admin de un evento. */
export function useAdminEvent(
  eventId: string,
): ReturnType<typeof useQuery<AdminEventModel, Error>> {
  return useQuery<AdminEventModel, Error>({
    queryKey: adminEventsKeys.detail(eventId),
    queryFn: () => adminEventsApi.getEvent(eventId),
    enabled: Boolean(eventId),
    retry: false,
  });
}
