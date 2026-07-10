import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api-client';

describe('ApiError.isRetryable', () => {
  it('retryable para 0 (network/timeout), 408, 429 y 5xx', () => {
    for (const status of [0, 408, 429, 500, 502, 503]) {
      expect(new ApiError({ code: 'X', message: 'x', status }).isRetryable).toBe(true);
    }
  });

  it('no retryable para 4xx restantes', () => {
    for (const status of [400, 401, 403, 404, 422]) {
      expect(new ApiError({ code: 'X', message: 'x', status }).isRetryable).toBe(false);
    }
  });

  it('respeta isRetryable explícito', () => {
    expect(new ApiError({ code: 'X', message: 'x', status: 400, isRetryable: true }).isRetryable).toBe(true);
  });

  it('es instancia de Error y expone code/status/correlationId', () => {
    const err = new ApiError({ code: 'NETWORK', message: 'x', status: 0, correlationId: 'abc' });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('NETWORK');
    expect(err.correlationId).toBe('abc');
  });
});
