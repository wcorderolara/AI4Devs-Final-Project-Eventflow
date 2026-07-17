// API client — vendor booking-intent confirm (US-061 / PB-P1-036 / FE-002; refactor US-063 / FE-003).
//
// Un único método `confirm` que llama `POST /api/v1/booking-intents/:id/confirm`. El body pasó
// de vacío a `{ disclaimer_accepted: true }` (Decisión US-063 D1 — paridad server-side con el
// create de US-060). Los errores se mapean a `ApiError` por el `httpClient`; los códigos
// consumibles por la UI son los del contrato §7 US-063: `DISCLAIMER_REQUIRED` (400),
// `AUTHENTICATION_REQUIRED`, `FORBIDDEN`, `BOOKING_INTENT_NOT_FOUND`,
// `BOOKING_INTENT_NOT_CONFIRMABLE`, `VALIDATION_ERROR` (path param no-uuid o body inválido).
// Cualquier otro cae al key i18n `UNEXPECTED`.
import { httpPost } from '@/shared/api-client';
import type {
  ConfirmBookingIntentEnvelope,
  ConfirmBookingIntentInput,
  ConfirmBookingIntentRequestBody,
  ConfirmBookingIntentView,
} from './vendorBookingsApi.types';
import { toConfirmBookingIntentView } from './vendorBookingsApi.types';

export const vendorBookingsApi = {
  async confirm(input: ConfirmBookingIntentInput): Promise<ConfirmBookingIntentView> {
    const body: ConfirmBookingIntentRequestBody = {
      disclaimer_accepted: input.disclaimerAccepted,
    };
    const envelope = await httpPost<ConfirmBookingIntentEnvelope, ConfirmBookingIntentRequestBody>(
      `/booking-intents/${encodeURIComponent(input.bookingIntentId)}/confirm`,
      { body },
    );
    return toConfirmBookingIntentView(envelope.data);
  },
};
