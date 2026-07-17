// API client — organizer booking-intents (US-060 / PB-P1-036 / FE-002).
//
// Un único método `create` que llama `POST /api/v1/booking-intents` con body snake_case
// `{ quote_id, disclaimer_accepted:true }` y desanida el envelope. Los errores se mapean a
// `ApiError` por el `httpClient`; los códigos consumibles por la UI son los del contrato §7:
// `DISCLAIMER_REQUIRED` (400), `VALIDATION_ERROR` (400), `AUTHENTICATION_REQUIRED` (401),
// `FORBIDDEN` (403), `QUOTE_NOT_FOUND` (404), `QUOTE_NOT_ACCEPTABLE` (409),
// `QUOTE_EXPIRED` (409/410 — el backend usa 409 con detail), `BOOKING_INTENT_ALREADY_EXISTS`
// (409). Cualquier otro cae al key i18n `UNEXPECTED`.
import { httpPost } from '@/shared/api-client';
import type {
  CreateBookingIntentEnvelope,
  CreateBookingIntentInput,
  CreateBookingIntentRequestBody,
  CreateBookingIntentView,
} from './organizerBookingsApi.types';
import { toCreateBookingIntentView } from './organizerBookingsApi.types';

export const organizerBookingsApi = {
  async create(input: CreateBookingIntentInput): Promise<CreateBookingIntentView> {
    const body: CreateBookingIntentRequestBody = {
      quote_id: input.quoteId,
      disclaimer_accepted: input.disclaimerAccepted,
    };
    const envelope = await httpPost<CreateBookingIntentEnvelope, CreateBookingIntentRequestBody>(
      `/booking-intents`,
      { body },
    );
    return toCreateBookingIntentView(envelope.data);
  },
};
