'use client';

// Hooks TanStack — organizer bookings (US-060 / PB-P1-036 / FE-002).
// Namespace `bookings.*` con `useCreateBookingIntent` (mutation). Invalida el comparador de
// Quotes para el `(eventId, categoryCode)` afectado (si el caller lo provee) — al aceptar una
// Quote la vista del comparador debe refrescar los estados (`accepted`) inmediatamente.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizerBookingsApi } from '../api/organizerBookingsApi';
import type {
  CreateBookingIntentInput,
  CreateBookingIntentView,
} from '../api/organizerBookingsApi.types';
import type { ApiError } from '@/shared/api-client';
import { quotesKeys } from '@/features/quotes/hooks/quotesQueries';

export const bookingsKeys = {
  all: ['bookings'] as const,
  intents: () => [...bookingsKeys.all, 'intents'] as const,
} as const;

export interface CreateBookingIntentContext {
  /** Si se provee, tras éxito se invalida `quotes.compare(eventId, categoryCode)`. */
  eventId?: string;
  categoryCode?: string;
}

export function useCreateBookingIntent(
  ctx: CreateBookingIntentContext = {},
): ReturnType<typeof useMutation<CreateBookingIntentView, ApiError, CreateBookingIntentInput>> {
  const qc = useQueryClient();
  return useMutation<CreateBookingIntentView, ApiError, CreateBookingIntentInput>({
    mutationFn: (input) => organizerBookingsApi.create(input),
    onSuccess: () => {
      if (ctx.eventId && ctx.categoryCode) {
        void qc.invalidateQueries({
          queryKey: quotesKeys.compare(ctx.eventId, ctx.categoryCode),
        });
      }
    },
  });
}
