// Cliente HTTP de siteverify (US-109 / BE-004, BE-005). Común a reCAPTCHA y hCaptcha.
// POST application/x-www-form-urlencoded con timeout corto (AbortController). `fetchFn` es
// inyectable para tests (por default el `fetch` global de Node >=22) → CI sin red externa.
// NUNCA loguea el token, el secret ni la respuesta cruda (SEC-03).

export type FetchLike = typeof fetch;

/** Forma parcial de la respuesta JSON de siteverify (reCAPTCHA v3 / hCaptcha). */
export interface SiteverifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

export type SiteverifyOutcome =
  | { ok: true; data: SiteverifyResponse }
  | { ok: false; reason: 'provider_timeout' | 'provider_error' };

/** POST a la URL de siteverify con timeout. Distingue timeout (abort) de otros errores. */
export async function postSiteverify(
  url: string,
  params: Record<string, string>,
  timeoutMs: number,
  fetchFn: FetchLike,
): Promise<SiteverifyOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, reason: 'provider_error' };
    const data = (await res.json()) as SiteverifyResponse;
    if (typeof data?.success !== 'boolean') return { ok: false, reason: 'provider_error' };
    return { ok: true, data };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return { ok: false, reason: aborted ? 'provider_timeout' : 'provider_error' };
  } finally {
    clearTimeout(timer);
  }
}
