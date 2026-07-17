// API client — cancel booking-intent bilateral (US-062 / PB-P1-036 / FE-002).
//
// Un único método `cancel` que llama `POST /api/v1/booking-intents/:id/cancel` con body opcional
// `{ reason?: string }` y desanida el envelope. El cliente omite `reason` cuando el usuario no
// escribe motivo (AC-03). Los errores se mapean a `ApiError` por el `httpClient`; los códigos
// consumibles por la UI son los del contrato §7 US-062: `INVALID_CANCELLATION_REASON`,
// `AUTHENTICATION_REQUIRED`, `FORBIDDEN`, `BOOKING_INTENT_NOT_FOUND`,
// `BOOKING_INTENT_NOT_CANCELLABLE`, `VALIDATION_ERROR`.
import { httpPost } from '@/shared/api-client';
import type {
  CancelBookingIntentEnvelope,
  CancelBookingIntentInput,
  CancelBookingIntentRequestBody,
  CancelBookingIntentView,
} from './bookingsApi.types';
import { toCancelBookingIntentView } from './bookingsApi.types';

export const bookingsApi = {
  async cancel(input: CancelBookingIntentInput): Promise<CancelBookingIntentView> {
    const body: CancelBookingIntentRequestBody = {};
    if (input.reason !== undefined && input.reason.trim().length > 0) {
      body.reason = input.reason.trim();
    }
    const envelope = await httpPost<CancelBookingIntentEnvelope, CancelBookingIntentRequestBody>(
      `/booking-intents/${encodeURIComponent(input.bookingIntentId)}/cancel`,
      { body },
    );
    return toCancelBookingIntentView(envelope.data);
  },
};
