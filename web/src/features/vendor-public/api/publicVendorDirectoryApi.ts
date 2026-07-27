// API client — Directorio público de vendors (`GET /public/vendors`).
//
// Mismo criterio que `vendorsPublicApi` (perfil por slug): fetch server-side directo en lugar de
// `httpClient`, porque
//   1) es un endpoint público — no necesita `credentials: 'include'`;
//   2) queremos el hint nativo `{ next: { revalidate } }` para que el cacheado de Next opere
//      sobre la respuesta upstream (además del `Cache-Control` del backend);
//   3) el caller decide qué hacer con un fallo: la página muestra un estado de error, no un 500.
//
// El shape es el mismo que devuelve el directorio autenticado, así que se reutilizan sus tipos:
// no hay una segunda definición del contrato de una tarjeta de proveedor.
import type {
  VendorSearchDataDTO,
  VendorSearchEnvelope,
  VendorSearchQuery,
} from '@/features/vendor-directory';

/** El listado cambia poco entre visitas; 5 min es el mismo horizonte que el perfil público. */
const REVALIDATE_SECONDS = 300;

function resolveBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
}

export interface PublicVendorListOkResult {
  status: 'ok';
  data: VendorSearchDataDTO;
}

/** Filtros rechazados por el backend (slug inexistente, cursor corrupto, rango inválido). */
export interface PublicVendorListInvalidResult {
  status: 'invalid_filters';
}

export interface PublicVendorListErrorResult {
  status: 'error';
  httpStatus: number;
}

export type PublicVendorListResult =
  PublicVendorListOkResult | PublicVendorListInvalidResult | PublicVendorListErrorResult;

function buildSearchParams(query: VendorSearchQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

export const publicVendorDirectoryApi = {
  async list(query: VendorSearchQuery = {}): Promise<PublicVendorListResult> {
    // `NEXT_PUBLIC_API_BASE_URL` ya incluye `/api/v1` (Doc 16 / web/.env.local.example).
    const qs = buildSearchParams(query);
    const url = `${resolveBaseUrl()}/public/vendors${qs ? `?${qs}` : ''}`;

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

    // Un 400 aquí siempre viene de los filtros de la URL, que el visitante puede corregir:
    // merece un mensaje propio y no el error genérico de «no pudimos cargar».
    if (response.status === 400) return { status: 'invalid_filters' };

    if (!response.ok) return { status: 'error', httpStatus: response.status };

    const envelope = (await response.json()) as VendorSearchEnvelope;
    return { status: 'ok', data: envelope.data };
  },
};
