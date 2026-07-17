'use client';

// Hooks TanStack — cancel booking bilateral (US-062 / PB-P1-036 / FE-002).
// El hook `useCancelBookingIntent` invalida las queries del intent (organizer y vendor)
// tras éxito. Uso compartido desde `CancelBookingDialog` — ambos roles reusan el mismo hook.
//
// US-064 (PB-P1-037 / FE-003) — AC-01 / EC-01: cross-domain revert Booking → Budget.
// Cuando el caller conoce el `eventId`, el hook invalida `budgetQueryKey(eventId)` post-success
// — el re-fetch muestra el `committed` disminuido (backend `revertOnCancel` ya aplicó el
// `MAX(0, committed - synced_amount)` sobre `BudgetItem`) y el anuncio aria-live del
// `BudgetSummary` reporta el cambio.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookingsApi';
import type {
  CancelBookingIntentInput,
  CancelBookingIntentView,
} from '../api/bookingsApi.types';
import type { ApiError } from '@/shared/api-client';
import { bookingsKeys } from './organizerBookingsQueries';
import { budgetQueryKey } from '@/features/budget/view/api/budgetApi';

export interface UseCancelBookingIntentOptions {
  /**
   * US-064 (FE-003): cuando se provee, el hook invalida `budgetQueryKey(eventId)` post-success
   * para reflejar el revert del committed en el `BudgetSummary`. Sin `eventId` el hook preserva
   * su comportamiento previo US-062 (sólo invalida bookings).
   */
  eventId?: string;
}

export function useCancelBookingIntent(
  options: UseCancelBookingIntentOptions = {},
): ReturnType<typeof useMutation<CancelBookingIntentView, ApiError, CancelBookingIntentInput>> {
  const qc = useQueryClient();
  const { eventId } = options;
  return useMutation<CancelBookingIntentView, ApiError, CancelBookingIntentInput>({
    mutationFn: (input) => bookingsApi.cancel(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingsKeys.intents() });
      if (eventId) {
        void qc.invalidateQueries({ queryKey: budgetQueryKey(eventId) });
      }
    },
  });
}
