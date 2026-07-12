export interface ApiErrorInit {
  code: string;
  message: string;
  status: number;
  details?: unknown;
  correlationId?: string;
  isRetryable?: boolean;
  /** Segundos del header `Retry-After` en 429 (US-003 / FE-002: banner de rate limit). */
  retryAfterSeconds?: number;
}

/**
 * Error tipado del `httpClient` (Doc 15 §23.3). `status: 0` indica network/timeout (sin response).
 * `isRetryable` se deriva del status si no se provee explícitamente.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  readonly correlationId?: string;
  readonly isRetryable: boolean;
  readonly retryAfterSeconds?: number;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.details = init.details;
    this.correlationId = init.correlationId;
    this.isRetryable = init.isRetryable ?? ApiError.deriveRetryable(init.status);
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  /** Retryable: network/timeout (0), 408, 429 y 5xx. No retryable: 4xx restantes (401/403/404/422…). */
  static deriveRetryable(status: number): boolean {
    return status === 0 || status === 408 || status === 429 || (status >= 500 && status < 600);
  }
}
