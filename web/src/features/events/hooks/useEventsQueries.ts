'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../api/eventsApi';
import type {
  EventListResult,
  EventModel,
  EventTypeOption,
  ListEventsParams,
  LocationOption,
} from '../api/eventsApi.types';

/** Query keys de la feature events. */
export const eventsKeys = {
  all: ['events'] as const,
  list: (params: ListEventsParams) => ['events', 'list', params] as const,
  detail: (id: string) => ['events', 'detail', id] as const,
  eventTypes: ['events', 'event-types'] as const,
  locations: ['events', 'locations'] as const,
};

/** US-013 / AC-02: listado paginado y filtrado. `placeholderData` evita parpadeo al paginar. */
export function useEventsList(
  params: ListEventsParams,
): ReturnType<typeof useQuery<EventListResult, Error>> {
  return useQuery<EventListResult, Error>({
    queryKey: eventsKeys.list(params),
    queryFn: () => eventsApi.list(params),
    staleTime: 15_000,
    retry: false,
  });
}

/** US-014 / AC-01: detalle de evento. */
export function useEvent(eventId: string): ReturnType<typeof useQuery<EventModel, Error>> {
  return useQuery<EventModel, Error>({
    queryKey: eventsKeys.detail(eventId),
    queryFn: () => eventsApi.getById(eventId),
    enabled: Boolean(eventId),
    retry: false,
  });
}

/** US-009 / AC-02: catálogo de tipos de evento (cacheado 5 min). */
export function useEventTypes(): ReturnType<typeof useQuery<EventTypeOption[], Error>> {
  return useQuery<EventTypeOption[], Error>({
    queryKey: eventsKeys.eventTypes,
    queryFn: () => eventsApi.listEventTypes(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** US-009: catálogo de ubicaciones (cacheado 5 min). */
export function useLocations(): ReturnType<typeof useQuery<LocationOption[], Error>> {
  return useQuery<LocationOption[], Error>({
    queryKey: eventsKeys.locations,
    queryFn: () => eventsApi.listLocations(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
