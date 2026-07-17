// API client — vendor booking-intent confirm (US-061 / PB-P1-036 / FE-002).
//
// Un único método `confirm` que llama `POST /api/v1/booking-intents/:id/confirm` (body vacío) y
// desanida el envelope. Los errores se mapean a `ApiError` por el `httpClient`; los códigos
// consumibles por la UI son los del contrato §7 US-061 Tech Spec: `AUTHENTICATION_REQUIRED`,
// `FORBIDDEN`, `BOOKING_INTENT_NOT_FOUND`, `BOOKING_INTENT_NOT_CONFIRMABLE`, `VALIDATION_ERROR`
// (path param no-uuid). Cualquier otro cae al key i18n `UNEXPECTED`.
import { httpPost } from '@/shared/api-client';
import type {
  ConfirmBookingIntentEnvelope,
  ConfirmBookingIntentInput,
  ConfirmBookingIntentView,
} from './vendorBookingsApi.types';
import { toConfirmBookingIntentView } from './vendorBookingsApi.types';

export const vendorBookingsApi = {
  async confirm(input: ConfirmBookingIntentInput): Promise<ConfirmBookingIntentView> {
    const envelope = await httpPost<ConfirmBookingIntentEnvelope, undefined>(
      `/booking-intents/${encodeURIComponent(input.bookingIntentId)}/confirm`,
      { body: undefined },
    );
    return toConfirmBookingIntentView(envelope.data);
  },
};
