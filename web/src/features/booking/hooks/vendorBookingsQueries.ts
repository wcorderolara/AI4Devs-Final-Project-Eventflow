'use client';

// Hooks TanStack — vendor bookings confirm (US-061 / PB-P1-036 / FE-002).
// Namespace `bookings.*` con `useConfirmBookingIntent` (mutation). Invalida la query del
// detalle del BookingIntent para reflejar el nuevo `status='confirmed_intent'` inmediatamente.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorBookingsApi } from '../api/vendorBookingsApi';
import type {
  ConfirmBookingIntentInput,
  ConfirmBookingIntentView,
} from '../api/vendorBookingsApi.types';
import type { ApiError } from '@/shared/api-client';
import { bookingsKeys } from './organizerBookingsQueries';

export function useConfirmBookingIntent(): ReturnType<
  typeof useMutation<ConfirmBookingIntentView, ApiError, ConfirmBookingIntentInput>
> {
  const qc = useQueryClient();
  return useMutation<ConfirmBookingIntentView, ApiError, ConfirmBookingIntentInput>({
    mutationFn: (input) => vendorBookingsApi.confirm(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingsKeys.intents() });
    },
  });
}
