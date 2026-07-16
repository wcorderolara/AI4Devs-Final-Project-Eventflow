// US-046 (PB-P1-029 / QA-001 + FE-004) — Unit tests para `vendorsPublicApi.get`.
// Verifica el mapeo del contrato HTTP a `PublicVendorLookupResult`:
//   - 200 → `{ status: 'ok', data }` (data desanidado del envelope canónico).
//   - 404 → `{ status: 'not_found' }` (D6 — traducido al helper explícito).
//   - 400/429 → `{ status: 'error', httpStatus, errorCode }`.
import { describe, expect, it } from 'vitest';
import { vendorsPublicApi } from '@/features/vendor-public/api/vendorPublicApi';

describe('US-046 · vendorsPublicApi.get', () => {
  it('retorna `ok` con el DTO cuando el backend responde 200 (MSW happy path)', async () => {
    const result = await vendorsPublicApi.get('banquetes-el-quetzal');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.slug).toBe('banquetes-el-quetzal');
      expect(result.data.businessName).toBe('Banquetes El Quetzal');
      expect(result.data.reviews).toHaveLength(10);
      expect(result.data.reviewsTotalPublished).toBe(24);
    }
  });

  it('retorna `not_found` cuando el backend responde 404 VENDOR_NOT_FOUND', async () => {
    const result = await vendorsPublicApi.get('slug-desconocido');
    expect(result.status).toBe('not_found');
  });

  it('retorna `error` con httpStatus=400 y errorCode=VALIDATION_ERROR ante slug inválido', async () => {
    const result = await vendorsPublicApi.get('slug-invalido');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.httpStatus).toBe(400);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    }
  });

  it('retorna `error` con httpStatus=429 y errorCode=RATE_LIMIT_EXCEEDED ante rate limit', async () => {
    const result = await vendorsPublicApi.get('slug-rate-limited');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.httpStatus).toBe(429);
      expect(result.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    }
  });

  it('retorna `ok` para vendor sin reviews ni portfolio', async () => {
    const result = await vendorsPublicApi.get('sin-reviews');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.ratingAvg).toBeNull();
      expect(result.data.reviewsCount).toBe(0);
      expect(result.data.portfolio).toEqual([]);
      expect(result.data.reviews).toEqual([]);
    }
  });
});
