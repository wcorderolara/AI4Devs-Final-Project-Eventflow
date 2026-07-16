// API client — Perfil público SEO del vendor (US-046 / FE-004).
// Server-side fetch: la página `app/vendors/[slug]/page.tsx` corre como Server Component y
// consume este client bajo ISR (`revalidate: 300`, D4). Bypasseamos `httpClient` porque:
//   1) es un endpoint público (no requiere `credentials: 'include'`);
//   2) queremos el hint nativo de Next.js `{ next: { revalidate } }` para que ISR y edge cache
//      operen correctamente sobre la respuesta upstream (además del `Cache-Control` del BE);
//   3) los 404 son parte del contrato — el caller decide si dispara `notFound()` de Next.
import type { PublicVendorDTO, PublicVendorEnvelope } from './vendorPublicApi.types';

const REVALIDATE_SECONDS = 300;

function resolveBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
}

export interface PublicVendorFetchResult {
  status: 'ok';
  data: PublicVendorDTO;
}

export interface PublicVendorNotFoundResult {
  status: 'not_found';
}

export interface PublicVendorErrorResult {
  status: 'error';
  httpStatus: number;
  errorCode?: string;
}

export type PublicVendorLookupResult =
  | PublicVendorFetchResult
  | PublicVendorNotFoundResult
  | PublicVendorErrorResult;

export const vendorsPublicApi = {
  async get(slug: string): Promise<PublicVendorLookupResult> {
    // `NEXT_PUBLIC_API_BASE_URL` ya incluye `/api/v1` (Doc 16 / web/.env.local.example).
    const url = `${resolveBaseUrl()}/public/vendors/${encodeURIComponent(slug)}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        next: { revalidate: REVALIDATE_SECONDS },
      });
    } catch {
      return { status: 'error', httpStatus: 0 };
    }

    if (response.status === 404) {
      return { status: 'not_found' };
    }

    if (!response.ok) {
      let errorCode: string | undefined;
      try {
        const envelope = (await response.json()) as { error?: { code?: string } };
        errorCode = envelope.error?.code;
      } catch {
        // Envelope no parseable: la UI mostrará el fallback de error genérico.
      }
      return { status: 'error', httpStatus: response.status, errorCode };
    }

    const envelope = (await response.json()) as PublicVendorEnvelope;
    return { status: 'ok', data: envelope.data };
  },
};
