// API client — quotes (US-049 / PB-P1-030 / FE-003).
// Un único método `createRequest` que llama `POST /api/v1/quote-requests` y desanida el envelope.
// Los errores se mapean automáticamente a `ApiError` por el `httpClient`; la vista consume el
// `errorCode` para pintar el banner i18n (`quotes.create.errors.*`).
import { httpGet, httpPost } from '@/shared/api-client';
import type {
  ActiveQrCountEnvelope,
  ActiveQrCountInput,
  ActiveQrCountView,
  CreateQuoteRequestEnvelope,
  CreateQuoteRequestInput,
  CreateQuoteRequestView,
  RejectQuoteEnvelope,
  RejectQuoteInput,
  RejectQuoteView,
} from './quotesApi.types';
import {
  toActiveQrCountView,
  toCreateQuoteRequestView,
  toRejectQuoteView,
} from './quotesApi.types';

export const quotesApi = {
  async createRequest(input: CreateQuoteRequestInput): Promise<CreateQuoteRequestView> {
    const envelope = await httpPost<CreateQuoteRequestEnvelope, CreateQuoteRequestInput>(
      `/quote-requests`,
      { body: input },
    );
    return toCreateQuoteRequestView(envelope.data);
  },

  /**
   * US-050 (FE-001): pre-check del límite BR-QUOTE-009. Retorna `{ active_count, limit,
   * available_slots, statuses_counted }` para el badge `QRLimitBadge` en el form de US-049.
   * Los errores (401/403/404/400) los propaga como `ApiError` para que la UI decida ocultar
   * el badge o mostrar el fallback correspondiente.
   */
  async activeCount(input: ActiveQrCountInput): Promise<ActiveQrCountView> {
    const qs = new URLSearchParams({
      event_id: input.eventId,
      service_category_id: input.serviceCategoryId,
    }).toString();
    const envelope = await httpGet<ActiveQrCountEnvelope>(`/quote-requests/active-count?${qs}`);
    return toActiveQrCountView(envelope.data);
  },

  /**
   * US-054 (FE-002): rechazo del Quote por el organizer dueño del evento. Body opcional con
   * `reason` (0..500). El backend emite 2 Notifications al vendor atómicamente. Los códigos
   * de error consumibles por el banner i18n del dialog: `INVALID_REJECTION_REASON` (400),
   * `AUTHENTICATION_REQUIRED` (401), `FORBIDDEN` (403), `QUOTE_NOT_FOUND` (404),
   * `QUOTE_NOT_REJECTABLE` (409).
   */
  async rejectQuote(input: RejectQuoteInput): Promise<RejectQuoteView> {
    const body: { reason?: string } = {};
    if (input.reason !== undefined && input.reason.length > 0) body.reason = input.reason;
    const envelope = await httpPost<RejectQuoteEnvelope, { reason?: string }>(
      `/quotes/${encodeURIComponent(input.quoteId)}/reject`,
      { body },
    );
    return toRejectQuoteView(envelope.data);
  },
};
