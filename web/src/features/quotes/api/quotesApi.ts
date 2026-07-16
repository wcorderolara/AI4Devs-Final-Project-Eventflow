// API client — quotes (US-049 / PB-P1-030 / FE-003).
// Un único método `createRequest` que llama `POST /api/v1/quote-requests` y desanida el envelope.
// Los errores se mapean automáticamente a `ApiError` por el `httpClient`; la vista consume el
// `errorCode` para pintar el banner i18n (`quotes.create.errors.*`).
import { httpPost } from '@/shared/api-client';
import type {
  CreateQuoteRequestEnvelope,
  CreateQuoteRequestInput,
  CreateQuoteRequestView,
} from './quotesApi.types';
import { toCreateQuoteRequestView } from './quotesApi.types';

export const quotesApi = {
  async createRequest(input: CreateQuoteRequestInput): Promise<CreateQuoteRequestView> {
    const envelope = await httpPost<CreateQuoteRequestEnvelope, CreateQuoteRequestInput>(
      `/quote-requests`,
      { body: input },
    );
    return toCreateQuoteRequestView(envelope.data);
  },
};
