export const CORRELATION_ID_HEADER = 'X-Correlation-Id';

/**
 * Genera un correlation ID (UUID v4 con `crypto.randomUUID()` — SEC-04). Fallback simple solo para
 * runtimes de test sin `crypto.randomUUID`; producción usa Node 20+/browsers modernos/Edge.
 */
export function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

/** Añade `X-Correlation-Id` a los headers si el caller no lo proveyó. */
export function attachCorrelationId(headers: Record<string, string>): Record<string, string> {
  if (headers[CORRELATION_ID_HEADER]) return headers;
  return { ...headers, [CORRELATION_ID_HEADER]: generateCorrelationId() };
}
