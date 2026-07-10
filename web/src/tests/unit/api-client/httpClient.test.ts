import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, httpGet, httpPost } from '@/shared/api-client';

afterEach(() => vi.restoreAllMocks());

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('httpClient — construcción de request', () => {
  it('concatena base URL, credentials include, Accept-Language, X-Correlation-Id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));
    await httpGet('/auth/me');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://localhost:3001/api/v1/auth/me');
    expect((init as RequestInit).credentials).toBe('include');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Accept-Language']).toBeTruthy();
    expect(headers['X-Correlation-Id']).toBeTruthy();
  });

  it('agrega Content-Type y serializa body en POST', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));
    await httpPost('/things', { body: { name: 'x' } });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'x' }));
  });

  it('response OK retorna el JSON tipado', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ status: 'ok' }));
    await expect(httpGet<{ status: string }>('/health')).resolves.toEqual({ status: 'ok' });
  });
});

describe('httpClient — errores', () => {
  it('401 con envelope → ApiError code UNAUTHENTICATED status 401 no retryable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'no' } }, { status: 401 }),
    );
    await expect(httpGet('/auth/me')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
      isRetryable: false,
    });
  });

  it('500 sin envelope (no-JSON) → ApiError UNEXPECTED retryable, sin exponer body (EC-02)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>proxy error</html>', { status: 500 }),
    );
    const error = (await httpGet('/x').catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('UNEXPECTED');
    expect(error.status).toBe(500);
    expect(error.isRetryable).toBe(true);
    expect(error.message).not.toContain('proxy');
  });

  it('network error → ApiError NETWORK retryable (NT-01)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    await expect(httpGet('/x')).rejects.toMatchObject({ code: 'NETWORK', status: 0, isRetryable: true });
  });

  it('timeout → ApiError TIMEOUT retryable (NT-03)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          (init as RequestInit).signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    await expect(httpGet('/slow', { timeoutMs: 10 })).rejects.toMatchObject({
      code: 'TIMEOUT',
      status: 0,
      isRetryable: true,
    });
  });

  it('preserva correlationId del response header', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'X', message: 'm' } }, {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': 'server-123' },
      }),
    );
    const error = (await httpGet('/x').catch((e) => e)) as ApiError;
    expect(error.correlationId).toBe('server-123');
  });
});
