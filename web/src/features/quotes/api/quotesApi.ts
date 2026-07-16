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
} from './quotesApi.types';
import { toActiveQrCountView, toCreateQuoteRequestView } from './quotesApi.types';

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
};
