// US-051 (PB-P1-031 / FE-003 + QA-002 smoke) — Unit tests para `vendorQrApi.*` contra los
// MSW handlers. Cubre 200 happy (detail + mark-viewed), 401/403/404 uniformes y la
// idempotencia del POST cuando el QR ya está `viewed`.
import { afterEach, describe, expect, it } from 'vitest';
import { vendorQrApi } from '@/features/quotes/api/vendorQrApi';
import {
  vendorQrMswTriggers,
  __resetVendorQrMswState,
} from '../msw/handlers/vendor-qr';
import type { ApiError } from '@/shared/api-client';

const HAPPY_QR_ID = '99999999-9999-9999-9999-000000000051';

describe('US-051 · vendorQrApi (MSW)', () => {
  afterEach(() => {
    __resetVendorQrMswState();
  });

  it('GET detail: 200 con status `sent` por defecto', async () => {
    const view = await vendorQrApi.detail(HAPPY_QR_ID);
    expect(view.id).toBe(HAPPY_QR_ID);
    expect(view.status).toBe('sent');
    expect(view.viewedAt).toBeNull();
  });

  it('GET detail: 401 uniforme cuando falta sesión', async () => {
    await expect(vendorQrApi.detail(vendorQrMswTriggers.UNAUTH)).rejects.toMatchObject({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
    } as Partial<ApiError>);
  });

  it('GET detail: 403 uniforme cuando el rol no es vendor', async () => {
    await expect(vendorQrApi.detail(vendorQrMswTriggers.FORBIDDEN)).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    } as Partial<ApiError>);
  });

  it('GET detail: 404 QR_NOT_FOUND uniforme (ajena/inexistente/hidden)', async () => {
    await expect(vendorQrApi.detail(vendorQrMswTriggers.NOT_FOUND)).rejects.toMatchObject({
      status: 404,
      code: 'QR_NOT_FOUND',
    } as Partial<ApiError>);
  });

  it('POST mark-viewed transiciona `sent → viewed` y devuelve el detalle actualizado', async () => {
    const before = await vendorQrApi.detail(HAPPY_QR_ID);
    expect(before.status).toBe('sent');
    const after = await vendorQrApi.markViewed(HAPPY_QR_ID);
    expect(after.status).toBe('viewed');
    expect(after.viewedAt).not.toBeNull();
    expect(after.viewedBy).not.toBeNull();
  });

  it('POST mark-viewed es idempotente cuando el QR ya está `viewed`', async () => {
    // Estado inicial forzado a `viewed` por el trigger.
    const initial = await vendorQrApi.detail(vendorQrMswTriggers.STATUS_VIEWED);
    expect(initial.status).toBe('viewed');
    const post = await vendorQrApi.markViewed(vendorQrMswTriggers.STATUS_VIEWED);
    expect(post.status).toBe('viewed');
    // El viewedAt inicial se preserva (misma row); no hay transición nueva.
    expect(post.viewedAt).toBe(initial.viewedAt);
  });

  it('POST mark-viewed devuelve estado actual cuando el QR está `responded` (AC-04)', async () => {
    const post = await vendorQrApi.markViewed(vendorQrMswTriggers.STATUS_RESPONDED);
    expect(post.status).toBe('responded');
  });

  it('POST mark-viewed: 401/403/404 uniformes', async () => {
    await expect(vendorQrApi.markViewed(vendorQrMswTriggers.UNAUTH)).rejects.toMatchObject({
      status: 401,
    });
    await expect(vendorQrApi.markViewed(vendorQrMswTriggers.FORBIDDEN)).rejects.toMatchObject({
      status: 403,
    });
    await expect(vendorQrApi.markViewed(vendorQrMswTriggers.NOT_FOUND)).rejects.toMatchObject({
      status: 404,
      code: 'QR_NOT_FOUND',
    });
  });
});
