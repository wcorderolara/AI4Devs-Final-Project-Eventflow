import { attachLocaleHeader } from '@/shared/i18n';
import { ApiError } from './ApiError';
import { attachCorrelationId, CORRELATION_ID_HEADER } from './attachCorrelationId';
import { parseErrorEnvelope } from './parseErrorEnvelope';
import type { HttpClientOptions } from './types';

const DEFAULT_TIMEOUT_MS = 10_000;
const AI_TIMEOUT_MS = 30_000;

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

function buildUrl(path: string, query?: HttpClientOptions['query']): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  const url = `${base}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

async function request<T, B = unknown>(
  method: Method,
  path: string,
  opts?: HttpClientOptions<B>,
): Promise<T> {
  const url = buildUrl(path, opts?.query);
  const hasBody = opts?.body !== undefined;

  let headers: Record<string, string> = {
    ...attachLocaleHeader(),
    ...(opts?.headers ?? {}),
  };
  headers = attachCorrelationId(headers);
  if (hasBody) headers['Content-Type'] = 'application/json';
  const correlationId = headers[CORRELATION_ID_HEADER];

  const timeoutMs = opts?.timeoutMs ?? (opts?.isAI ? AI_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  // Compone la señal del caller (cancelación externa) con el timeout interno.
  opts?.signal?.addEventListener('abort', () => controller.abort());

  if (isDev()) {
    // SEC-05: sin body ni cookies.
    // eslint-disable-next-line no-console
    console.debug('httpClient.request', { method, path, correlationId });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(opts?.body) : undefined,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    if (timedOut) {
      throw new ApiError({ code: 'TIMEOUT', message: 'Request timed out', status: 0, isRetryable: true });
    }
    throw new ApiError({ code: 'NETWORK', message: 'Network error', status: 0, isRetryable: true });
  }
  clearTimeout(timeout);

  const responseCorrelationId = response.headers.get(CORRELATION_ID_HEADER) ?? correlationId;

  if (!response.ok) {
    let parsed = null;
    try {
      parsed = parseErrorEnvelope(await response.json());
    } catch {
      parsed = null;
    }
    const retryAfterRaw = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterRaw !== null ? Number.parseInt(retryAfterRaw, 10) : NaN;
    const apiError = new ApiError({
      code: parsed?.code ?? 'UNEXPECTED',
      message: parsed?.message ?? 'Unexpected error',
      details: parsed?.details,
      status: response.status,
      correlationId: responseCorrelationId ?? undefined,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
    });
    if (isDev()) {
      // eslint-disable-next-line no-console
      console.error('httpClient.error', {
        method,
        path,
        status: response.status,
        code: apiError.code,
        correlationId: apiError.correlationId,
      });
    }
    throw apiError;
  }

  // Contrato Doc 16: 204 No Content no trae body (p. ej. logout US-005, reset US-004).
  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    // EC-02: response no-JSON. No exponer el body (puede ser HTML sensible del proxy).
    throw new ApiError({
      code: 'UNEXPECTED',
      message: 'Invalid response body',
      status: response.status,
      isRetryable: true,
      correlationId: responseCorrelationId ?? undefined,
    });
  }
}

export function httpGet<T>(path: string, opts?: HttpClientOptions): Promise<T> {
  return request<T>('GET', path, opts);
}
export function httpPost<T, B = unknown>(path: string, opts?: HttpClientOptions<B>): Promise<T> {
  return request<T, B>('POST', path, opts);
}
export function httpPatch<T, B = unknown>(path: string, opts?: HttpClientOptions<B>): Promise<T> {
  return request<T, B>('PATCH', path, opts);
}
export function httpPut<T, B = unknown>(path: string, opts?: HttpClientOptions<B>): Promise<T> {
  return request<T, B>('PUT', path, opts);
}
export function httpDelete<T>(path: string, opts?: HttpClientOptions): Promise<T> {
  return request<T>('DELETE', path, opts);
}
