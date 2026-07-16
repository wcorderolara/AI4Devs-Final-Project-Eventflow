// US-052 (PB-P1-031 / FE-003 + QA-002 smoke) — Unit tests para `vendorQrApi.respond`
// contra los MSW handlers. Cubre 201 happy + 400/401/403/404/409 con códigos específicos.
import { afterEach, describe, expect, it } from 'vitest';
import { vendorQrApi, type RespondVendorQrInput } from '@/features/quotes/api/vendorQrApi';
import {
  vendorQrMswTriggers,
  __resetVendorQrMswState,
} from '../msw/handlers/vendor-qr';
import type { ApiError } from '@/shared/api-client';

const HAPPY_QR_ID = '99999999-9999-9999-9999-000000000052';

const validInput: RespondVendorQrInput = {
  total_price: '150.00',
  breakdown: [
    { label: 'A', amount: '100.00' },
    { label: 'B', amount: '50.00' },
  ],
  conditions: 'ok',
  valid_until: '2026-08-15',
};

describe('US-052 · vendorQrApi.respond (MSW)', () => {
  afterEach(() => {
    __resetVendorQrMswState();
  });

  it('201 happy: devuelve el Quote creado con status="sent"', async () => {
    const view = await vendorQrApi.respond(HAPPY_QR_ID, validInput);
    expect(view.status).toBe('sent');
    expect(view.quoteRequestId).toBe(HAPPY_QR_ID);
    expect(view.totalPrice).toBe('150.00');
    expect(view.currencyCode).toBe('GTQ');
    expect(view.validUntil).toBe('2026-08-15T23:59:59Z');
  });

  it('401 uniforme cuando falta sesión', async () => {
    await expect(
      vendorQrApi.respond(vendorQrMswTriggers.UNAUTH, validInput),
    ).rejects.toMatchObject({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
    } as Partial<ApiError>);
  });

  it('403 uniforme cuando el rol no es vendor', async () => {
    await expect(
      vendorQrApi.respond(vendorQrMswTriggers.FORBIDDEN, validInput),
    ).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    } as Partial<ApiError>);
  });

  it('404 QR_NOT_FOUND uniforme para QR ajena/inexistente', async () => {
    await expect(
      vendorQrApi.respond(vendorQrMswTriggers.NOT_FOUND, validInput),
    ).rejects.toMatchObject({
      status: 404,
      code: 'QR_NOT_FOUND',
    } as Partial<ApiError>);
  });

  it('409 QR_NOT_RESPONDABLE cuando el QR no está en {sent, viewed}', async () => {
    await expect(
      vendorQrApi.respond(vendorQrMswTriggers.QR_NOT_RESPONDABLE, validInput),
    ).rejects.toMatchObject({
      status: 409,
      code: 'QR_NOT_RESPONDABLE',
    } as Partial<ApiError>);
  });

  it('409 QUOTE_ALREADY_EXISTS cuando ya existe Quote vigente', async () => {
    await expect(
      vendorQrApi.respond(vendorQrMswTriggers.QUOTE_ALREADY_EXISTS, validInput),
    ).rejects.toMatchObject({
      status: 409,
      code: 'QUOTE_ALREADY_EXISTS',
    } as Partial<ApiError>);
  });

  it('400 INVALID_TOTAL / INVALID_BREAKDOWN_SUM / INVALID_VALID_UNTIL', async () => {
    await expect(
      vendorQrApi.respond(vendorQrMswTriggers.INVALID_TOTAL, validInput),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_TOTAL' });
    await expect(
      vendorQrApi.respond(vendorQrMswTriggers.INVALID_BREAKDOWN_SUM, validInput),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_BREAKDOWN_SUM' });
    await expect(
      vendorQrApi.respond(vendorQrMswTriggers.INVALID_VALID_UNTIL, validInput),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_VALID_UNTIL' });
  });
});
