'use client';

// Hooks TanStack — cancel booking bilateral (US-062 / PB-P1-036 / FE-002).
// El hook `useCancelBookingIntent` invalida las queries del intent (organizer y vendor)
// tras éxito. Uso compartido desde `CancelBookingDialog` — ambos roles reusan el mismo hook.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookingsApi';
import type {
  CancelBookingIntentInput,
  CancelBookingIntentView,
} from '../api/bookingsApi.types';
import type { ApiError } from '@/shared/api-client';
import { bookingsKeys } from './organizerBookingsQueries';

export function useCancelBookingIntent(): ReturnType<
  typeof useMutation<CancelBookingIntentView, ApiError, CancelBookingIntentInput>
> {
  const qc = useQueryClient();
  return useMutation<CancelBookingIntentView, ApiError, CancelBookingIntentInput>({
    mutationFn: (input) => bookingsApi.cancel(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingsKeys.intents() });
    },
  });
}
