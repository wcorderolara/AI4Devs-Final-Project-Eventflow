import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachCorrelationId, CORRELATION_ID_HEADER, generateCorrelationId } from '@/shared/api-client';

afterEach(() => vi.restoreAllMocks());

describe('attachCorrelationId', () => {
  it('agrega X-Correlation-Id si no existe', () => {
    const headers = attachCorrelationId({});
    expect(headers[CORRELATION_ID_HEADER]).toBeTruthy();
  });

  it('preserva el X-Correlation-Id provisto por el caller', () => {
    const headers = attachCorrelationId({ [CORRELATION_ID_HEADER]: 'caller-id' });
    expect(headers[CORRELATION_ID_HEADER]).toBe('caller-id');
  });

  it('usa crypto.randomUUID cuando está disponible', () => {
    const spy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111');
    expect(generateCorrelationId()).toBe('11111111-1111-4111-8111-111111111111');
    expect(spy).toHaveBeenCalled();
  });

  it('fallback cuando crypto.randomUUID no existe (NT-04 / EC-05)', () => {
    const original = crypto.randomUUID;
    // @ts-expect-error simular runtime sin randomUUID
    crypto.randomUUID = undefined;
    try {
      const id = generateCorrelationId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    } finally {
      crypto.randomUUID = original;
    }
  });
});
