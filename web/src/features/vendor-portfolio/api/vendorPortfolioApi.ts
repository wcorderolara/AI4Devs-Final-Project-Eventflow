// API client — vendor-portfolio (US-043 / PB-P1-026 / FE-003).
// Sigue el patrón `featureApi → mapper → modelo` (Doc 15 §24). El httpClient compartido
// serializa en JSON — para multipart usamos `fetch` directo respetando las mismas convenciones
// (credentials incluidos, correlationId auto-generado, Accept-Language). No se declara
// `Content-Type` manualmente: el navegador lo agrega con el boundary correcto cuando el body
// es `FormData`.
import { ApiError, CORRELATION_ID_HEADER, attachCorrelationId, httpDelete, parseErrorEnvelope } from '@/shared/api-client';
import { attachLocaleHeader } from '@/shared/i18n';
import type {
  DeletePortfolioImageInput,
  PortfolioImageView,
  UploadPortfolioImageEnvelopeDTO,
  UploadPortfolioImageInput,
} from './vendorPortfolioApi.types';
import { toPortfolioImageView } from './vendorPortfolioApi.types';

const UPLOAD_TIMEOUT_MS = 30_000;

function buildUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return `${base}${path}`;
}

export const vendorPortfolioApi = {
  /**
   * US-043 / AC-01: sube una imagen al `work_label` indicado del vendor autenticado.
   * Usa multipart/form-data con campo `file`. Retorna la vista normalizada del attachment
   * (sin `storage_url` en la superficie del modelo — solo metadatos consumibles por UI).
   */
  async uploadPortfolioImage(input: UploadPortfolioImageInput): Promise<PortfolioImageView> {
    const url = buildUrl(
      `/vendors/me/portfolio/works/${encodeURIComponent(input.workLabel)}/images`,
    );
    const body = new FormData();
    body.append('file', input.file);

    const headers = attachCorrelationId({ ...attachLocaleHeader() });
    const controller = new AbortController();
    const timedOut = { value: false };
    const timeout = setTimeout(() => {
      timedOut.value = true;
      controller.abort();
    }, UPLOAD_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        credentials: 'include',
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeout);
      if (timedOut.value) {
        throw new ApiError({
          code: 'TIMEOUT',
          message: 'Upload timed out',
          status: 0,
          isRetryable: true,
        });
      }
      throw new ApiError({
        code: 'NETWORK',
        message: 'Network error during upload',
        status: 0,
        isRetryable: true,
      });
    }
    clearTimeout(timeout);

    const responseCorrelationId = response.headers.get(CORRELATION_ID_HEADER) ?? undefined;

    if (!response.ok) {
      let parsed = null;
      try {
        parsed = parseErrorEnvelope(await response.json());
      } catch {
        parsed = null;
      }
      throw new ApiError({
        code: parsed?.code ?? 'UNEXPECTED',
        message: parsed?.message ?? 'Upload failed',
        details: parsed?.details,
        status: response.status,
        correlationId: responseCorrelationId,
      });
    }

    const envelope = (await response.json()) as UploadPortfolioImageEnvelopeDTO;
    return toPortfolioImageView(envelope.data);
  },

  /**
   * US-048 / AC-01: soft delete del attachment del vendor autenticado. Response 204 (sin body).
   * `deletion_reason` opcional; el backend responde `404 ATTACHMENT_NOT_FOUND` uniforme para
   * ajeno / inexistente / ya-borrado (D4).
   */
  async deletePortfolioImage(input: DeletePortfolioImageInput): Promise<void> {
    const body =
      input.deletionReason !== undefined && input.deletionReason.trim().length > 0
        ? { deletion_reason: input.deletionReason.trim() }
        : undefined;
    await httpDelete<void>(`/vendors/me/portfolio/images/${input.imageId}`, { body });
  },
};
