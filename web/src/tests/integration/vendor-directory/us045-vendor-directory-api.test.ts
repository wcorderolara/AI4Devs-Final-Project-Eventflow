// US-045 QA-002 (FE, MSW) — Contrato del cliente `vendorsApi.search` contra los handlers
// mockeados. Verifica que la primera página retorna items + cursor, que el cursor pagina a la
// segunda página sin duplicados, y que los códigos de error (`INVALID_FILTERS`, `INVALID_CURSOR`,
// `AUTHENTICATION_REQUIRED`) se propagan como `ApiError` con el status correcto.
import { describe, expect, it, vi } from 'vitest';
import { vendorsApi } from '@/features/vendor-directory';

describe('US-045 QA-002 (FE): vendorsApi.search', () => {
  it('primera página trae items + cursor hasNext', async () => {
    const result = await vendorsApi.search({ limit: 20 });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.page.hasNext).toBe(true);
    expect(result.page.cursor).not.toBeNull();
  });

  it('segunda página con cursor no repite ids', async () => {
    const first = await vendorsApi.search({ limit: 20 });
    const second = await vendorsApi.search({ cursor: first.page.cursor ?? undefined, limit: 20 });
    const ids1 = first.items.map((i) => i.id);
    const ids2 = second.items.map((i) => i.id);
    expect(new Set([...ids1, ...ids2]).size).toBe(ids1.length + ids2.length);
    expect(second.page.hasNext).toBe(false);
  });

  it('categoryCode inexistente → 400 INVALID_FILTERS', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(vendorsApi.search({ categoryCode: 'msw-invalid-category' })).rejects.toMatchObject({
      code: 'INVALID_FILTERS',
      status: 400,
    });
  });

  it('cursor corrupto → 400 INVALID_CURSOR', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(vendorsApi.search({ cursor: 'not-a-cursor' })).rejects.toMatchObject({
      code: 'INVALID_CURSOR',
      status: 400,
    });
  });

  it('sin sesión → 401 AUTHENTICATION_REQUIRED (via trigger)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(vendorsApi.search({ categoryCode: 'msw-unauth' })).rejects.toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
      status: 401,
    });
  });
});
