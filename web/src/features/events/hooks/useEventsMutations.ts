'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { eventsApi } from '../api/eventsApi';
import type {
  CreateEventRequestDTO,
  EventModel,
  UpdateEventRequestDTO,
} from '../api/eventsApi.types';
import { eventsKeys } from './useEventsQueries';

/** US-009 / AC-01: crear evento; en éxito invalida las listas y navega al detalle. */
export function useCreateEvent(): ReturnType<
  typeof useMutation<EventModel, Error, CreateEventRequestDTO>
> {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation<EventModel, Error, CreateEventRequestDTO>({
    mutationFn: (input) => eventsApi.create(input),
    onSuccess: async (event) => {
      await queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      router.push(`/organizer/events/${event.id}`);
    },
  });
}

/** US-010 / AC-04: editar evento; invalida detalle + listas. */
export function useUpdateEvent(
  eventId: string,
): ReturnType<typeof useMutation<EventModel, Error, UpdateEventRequestDTO>> {
  const queryClient = useQueryClient();
  return useMutation<EventModel, Error, UpdateEventRequestDTO>({
    mutationFn: (input) => eventsApi.update(eventId, input),
    onSuccess: async (event) => {
      queryClient.setQueryData(eventsKeys.detail(eventId), event);
      await queryClient.invalidateQueries({ queryKey: eventsKeys.all });
    },
  });
}

/** US-011 / AC-07: cancelar evento; invalida detalle + listas. */
export function useCancelEvent(
  eventId: string,
): ReturnType<typeof useMutation<EventModel, Error, void>> {
  const queryClient = useQueryClient();
  return useMutation<EventModel, Error, void>({
    mutationFn: () => eventsApi.cancel(eventId),
    onSuccess: async (event) => {
      queryClient.setQueryData(eventsKeys.detail(eventId), event);
      await queryClient.invalidateQueries({ queryKey: eventsKeys.all });
    },
  });
}

/** US-012 / AC-01: soft delete de borrador; invalida las listas. */
export function useDeleteEvent(): ReturnType<typeof useMutation<void, Error, string>> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (eventId) => eventsApi.remove(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eventsKeys.all });
    },
  });
}
