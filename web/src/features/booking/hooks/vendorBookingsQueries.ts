'use client';

// Hooks TanStack — vendor bookings confirm (US-061 / PB-P1-036 / FE-002).
// Namespace `bookings.*` con `useConfirmBookingIntent` (mutation). Invalida la query del
// detalle del BookingIntent para reflejar el nuevo `status='confirmed_intent'` inmediatamente.
//
// US-064 (PB-P1-037 / FE-003) — AC-01 / EC-01: cross-domain refresh Booking → Budget.
// Cuando el caller conoce el `eventId` (típicamente porque abrió el confirm dialog desde el
// detalle de un evento), lo pasa como opción del hook. `onSuccess` entonces invalida también
// la query canónica `budgetQueryKey(eventId) = ['event', eventId, 'budget']` compartida por
// US-035/036/037/038, forzando el re-fetch del summary y disparando el anuncio aria-live +
// warning visual `over_committed` en el `BudgetSummary` de US-064 FE-002.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorBookingsApi } from '../api/vendorBookingsApi';
import type {
  ConfirmBookingIntentInput,
  ConfirmBookingIntentView,
} from '../api/vendorBookingsApi.types';
import type { ApiError } from '@/shared/api-client';
import { bookingsKeys } from './organizerBookingsQueries';
import { budgetQueryKey } from '@/features/budget/view/api/budgetApi';

export interface UseConfirmBookingIntentOptions {
  /**
   * US-064 (FE-003): cuando se provee, el hook invalida `budgetQueryKey(eventId)` post-success
   * — dispara el re-fetch del `BudgetSummary` y el anuncio `aria-live` del committed actualizado.
   * Sin `eventId` el hook preserva su comportamiento previo US-061 (sólo invalida bookings).
   */
  eventId?: string;
}

export function useConfirmBookingIntent(
  options: UseConfirmBookingIntentOptions = {},
): ReturnType<typeof useMutation<ConfirmBookingIntentView, ApiError, ConfirmBookingIntentInput>> {
  const qc = useQueryClient();
  const { eventId } = options;
  return useMutation<ConfirmBookingIntentView, ApiError, ConfirmBookingIntentInput>({
    mutationFn: (input) => vendorBookingsApi.confirm(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingsKeys.intents() });
      if (eventId) {
        void qc.invalidateQueries({ queryKey: budgetQueryKey(eventId) });
      }
    },
  });
}
