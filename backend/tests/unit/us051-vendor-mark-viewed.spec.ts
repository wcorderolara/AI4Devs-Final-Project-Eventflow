// US-051 (PB-P1-031 / QA-001..QA-003) — Unit tests.
// Cobertura:
//   - DTO `qrIdParamSchema` (BE-001): shape estricto + UUID + rechazo de campos extra.
//   - `GetVendorQrDetailUs051UseCase` (BE-004): branches happy / vendor hidden / vendor missing /
//     QR ajena.
//   - `MarkVendorQrViewedUs051UseCase` (BE-003): branches sent → viewed (feliz), idempotencia
//     por estado != sent, expirada (EC-01), race con UPDATE=0, QR no asignada, vendor hidden.
//
// El use case interactúa con Prisma vía `$queryRaw` / `$executeRaw`. En los tests usamos un
// stub de `PrismaClient` que envía las llamadas de la transacción a un mock — la lógica del
// UC se ejercita íntegramente sin base de datos real.
import { describe, expect, it, vi } from 'vitest';
import { qrIdParamSchema } from '../../src/modules/quote-flow/interface/us051-vendor-quote-requests.routes.js';
import { GetVendorQrDetailUs051UseCase } from '../../src/modules/quote-flow/application/get-vendor-qr-detail.us051.use-case.js';
import { MarkVendorQrViewedUs051UseCase } from '../../src/modules/quote-flow/application/mark-vendor-qr-viewed.us051.use-case.js';
import { QrNotFoundError } from '../../src/modules/quote-flow/domain/us052.errors.js';
import type { QuoteRequestRepository } from '../../src/modules/quote-flow/ports/quote-flow.repositories.js';
import type {
  VendorProfileReader,
  ActiveVendorProfile,
} from '../../src/shared/access/readers.js';
import type { QuoteNotificationSenderPort } from '../../src/shared/application/quote-notification-sender.port.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import type { QuoteRequestView } from '../../src/modules/quote-flow/domain/quote-request.js';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const QR_ID = '22222222-2222-2222-2222-222222222222';
const VP_ID = '33333333-3333-3333-3333-333333333333';
const EVENT_ID = '44444444-4444-4444-4444-444444444444';
const ORGANIZER_ID = '55555555-5555-5555-5555-555555555555';
const CATEGORY_ID = '66666666-6666-6666-6666-666666666666';

function activeVendorProfile(overrides: Partial<ActiveVendorProfile> = {}): ActiveVendorProfile {
  return { id: VP_ID, status: 'approved', userId: USER_ID, ...overrides };
}

function baseQrView(overrides: Partial<QuoteRequestView> = {}): QuoteRequestView {
  return {
    id: QR_ID,
    eventId: EVENT_ID,
    serviceCategoryId: CATEGORY_ID,
    vendorProfileId: VP_ID,
    status: 'sent',
    brief: null,
    aiRecommendationId: null,
    viewedAt: null,
    viewedBy: null,
    cancelledAt: null,
    createdAt: '2026-07-15T09:00:00Z',
    updatedAt: '2026-07-15T09:00:00Z',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────
describe('US-051 · qrIdParamSchema', () => {
  it('acepta un UUID válido', () => {
    const parsed = qrIdParamSchema.safeParse({ id: QR_ID });
    expect(parsed.success).toBe(true);
  });

  it('rechaza un id no-UUID', () => {
    const parsed = qrIdParamSchema.safeParse({ id: 'not-a-uuid' });
    expect(parsed.success).toBe(false);
  });

  it('rechaza claves extra (.strict())', () => {
    const parsed = qrIdParamSchema.safeParse({ id: QR_ID, extra: 'x' });
    expect(parsed.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GetVendorQrDetailUs051UseCase
// ─────────────────────────────────────────────────────────────────────────────
describe('US-051 · GetVendorQrDetailUs051UseCase', () => {
  function make(overrides: {
    findActive?: () => Promise<ActiveVendorProfile | null>;
    findQr?: () => Promise<QuoteRequestView | null>;
  } = {}) {
    const vendors: VendorProfileReader = {
      getVendorProfileIdForUser: async () => VP_ID,
      existsActive: async () => true,
      findActiveByUserId: overrides.findActive ?? (async () => activeVendorProfile()),
    };
    const qrRepo: QuoteRequestRepository = {
      createWithChecks: async () => baseQrView(),
      findById: async () => baseQrView(),
      findByIdAndVendorProfile: overrides.findQr ?? (async () => baseQrView()),
      listByEvent: async () => ({ items: [], total: 0 }),
      listByVendor: async () => ({ items: [], total: 0 }),
      markViewed: async () => baseQrView(),
      cancel: async () => baseQrView(),
    };
    return new GetVendorQrDetailUs051UseCase(qrRepo, vendors);
  }

  it('devuelve la vista cuando el vendor está aprobado y el QR le pertenece', async () => {
    const uc = make();
    const view = await uc.execute(USER_ID, QR_ID);
    expect(view.id).toBe(QR_ID);
    expect(view.vendorProfileId).toBe(VP_ID);
  });

  it('lanza 404 uniforme cuando el usuario no tiene vendor profile', async () => {
    const uc = make({ findActive: async () => null });
    await expect(uc.execute(USER_ID, QR_ID)).rejects.toBeInstanceOf(QrNotFoundError);
  });

  it('lanza 404 uniforme cuando el vendor profile está `hidden`', async () => {
    const uc = make({ findActive: async () => activeVendorProfile({ status: 'hidden' }) });
    await expect(uc.execute(USER_ID, QR_ID)).rejects.toBeInstanceOf(QrNotFoundError);
  });

  it('lanza 404 uniforme cuando el QR no pertenece al vendor', async () => {
    const uc = make({ findQr: async () => null });
    await expect(uc.execute(USER_ID, QR_ID)).rejects.toBeInstanceOf(QrNotFoundError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MarkVendorQrViewedUs051UseCase
// ─────────────────────────────────────────────────────────────────────────────
interface FakeTxSetup {
  qrRow?: Record<string, unknown> | null;
  eventRow?: { user_id: string } | null;
  updateAffected?: number;
  afterUpdateRow?: Record<string, unknown> | null;
}

function makeUcWithFakeTx(
  setup: FakeTxSetup,
  overrides: {
    findActive?: () => Promise<ActiveVendorProfile | null>;
    now?: Date;
  } = {},
) {
  const vendors: VendorProfileReader = {
    getVendorProfileIdForUser: async () => VP_ID,
    existsActive: async () => true,
    findActiveByUserId: overrides.findActive ?? (async () => activeVendorProfile()),
  };
  const notify = vi.fn(async () => {});
  const notifications: QuoteNotificationSenderPort = { notify };
  const emit = vi.fn();
  const logger: DomainEventLogger = { emit };
  const clock: ClockPort = { now: () => overrides.now ?? new Date('2026-07-16T12:00:00Z') };

  // Fake $queryRaw / $executeRaw devuelven en el orden esperado por el UC.
  const queryCalls: unknown[] = [];
  const executeCalls: unknown[] = [];

  const tx = {
    async $queryRaw<T>(): Promise<T> {
      const callIndex = queryCalls.push(null) - 1;
      // Call 0 = lock QR ; Call 1 = event lookup ; Call 2 = re-read tras UPDATE=0 (opcional)
      if (callIndex === 0) {
        return (setup.qrRow ? [setup.qrRow] : []) as T;
      }
      if (setup.updateAffected === 0 && callIndex === 1) {
        return (setup.afterUpdateRow ? [setup.afterUpdateRow] : []) as T;
      }
      if (callIndex === 1) {
        return (setup.eventRow ? [setup.eventRow] : []) as T;
      }
      return [] as T;
    },
    async $executeRaw(): Promise<number> {
      executeCalls.push(null);
      return setup.updateAffected ?? 1;
    },
  };

  const prismaStub = {
    async $transaction<T>(cb: (tx: unknown) => Promise<T>): Promise<T> {
      return cb(tx);
    },
  } as unknown as import('@prisma/client').PrismaClient;

  const uc = new MarkVendorQrViewedUs051UseCase(vendors, notifications, clock, logger, prismaStub);
  return { uc, notify, emit, executeCalls, queryCalls };
}

describe('US-051 · MarkVendorQrViewedUs051UseCase', () => {
  const qrLockRowSent = {
    id: QR_ID,
    event_id: EVENT_ID,
    service_category_id: CATEGORY_ID,
    vendor_profile_id: VP_ID,
    status: 'sent',
    brief: null,
    ai_recommendation_id: null,
    viewed_at: null,
    viewed_by: null,
    cancelled_at: null,
    expires_at: null,
    created_at: new Date('2026-07-15T09:00:00Z'),
    updated_at: new Date('2026-07-15T09:00:00Z'),
  };

  it('transiciona `sent → viewed`, inserta Notification y emite el log', async () => {
    const { uc, notify, emit } = makeUcWithFakeTx({
      qrRow: qrLockRowSent,
      eventRow: { user_id: ORGANIZER_ID },
      updateAffected: 1,
    });
    const view = await uc.execute(USER_ID, QR_ID, { correlationId: 'corr-1' });
    expect(view.status).toBe('viewed');
    expect(view.viewedBy).toBe(USER_ID);
    expect(view.viewedAt).toBe('2026-07-16T12:00:00.000Z');
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'in_app',
      recipientUserId: ORGANIZER_ID,
      event: 'quote_request.viewed',
      deliveryStatus: 'delivered',
    }));
    expect(emit).toHaveBeenCalledWith('quote_request.viewed', expect.objectContaining({
      correlationId: 'corr-1',
      actorId: USER_ID,
      quoteRequestId: QR_ID,
    }));
  });

  it('es idempotente cuando el status ya es `viewed` (no notifica ni loguea)', async () => {
    const { uc, notify, emit } = makeUcWithFakeTx({
      qrRow: { ...qrLockRowSent, status: 'viewed', viewed_at: new Date('2026-07-15T10:00:00Z'), viewed_by: USER_ID },
    });
    const view = await uc.execute(USER_ID, QR_ID);
    expect(view.status).toBe('viewed');
    expect(notify).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('devuelve el estado actual sin transición cuando el QR está `responded` (AC-04)', async () => {
    const { uc, notify } = makeUcWithFakeTx({
      qrRow: { ...qrLockRowSent, status: 'responded' },
    });
    const view = await uc.execute(USER_ID, QR_ID);
    expect(view.status).toBe('responded');
    expect(notify).not.toHaveBeenCalled();
  });

  it('EC-01 no transiciona si el QR está expirado (expires_at <= NOW())', async () => {
    const { uc, notify } = makeUcWithFakeTx({
      qrRow: { ...qrLockRowSent, expires_at: new Date('2026-07-16T00:00:00Z') },
    });
    const view = await uc.execute(USER_ID, QR_ID);
    expect(view.status).toBe('sent');
    expect(notify).not.toHaveBeenCalled();
  });

  it('devuelve estado actual cuando otro TX ganó la carrera (UPDATE=0)', async () => {
    const { uc, notify } = makeUcWithFakeTx({
      qrRow: qrLockRowSent,
      updateAffected: 0,
      afterUpdateRow: { ...qrLockRowSent, status: 'viewed', viewed_at: new Date('2026-07-16T11:59:59Z'), viewed_by: 'other-user' },
    });
    const view = await uc.execute(USER_ID, QR_ID);
    expect(view.status).toBe('viewed');
    expect(view.viewedBy).toBe('other-user');
    expect(notify).not.toHaveBeenCalled();
  });

  it('lanza 404 uniforme cuando el QR no pertenece al vendor', async () => {
    const { uc } = makeUcWithFakeTx({ qrRow: null });
    await expect(uc.execute(USER_ID, QR_ID)).rejects.toBeInstanceOf(QrNotFoundError);
  });

  it('lanza 404 uniforme cuando el vendor profile está `hidden`', async () => {
    const { uc } = makeUcWithFakeTx(
      { qrRow: qrLockRowSent },
      { findActive: async () => activeVendorProfile({ status: 'hidden' }) },
    );
    await expect(uc.execute(USER_ID, QR_ID)).rejects.toBeInstanceOf(QrNotFoundError);
  });

  it('lanza 404 uniforme cuando no existe vendor profile para el usuario', async () => {
    const { uc } = makeUcWithFakeTx(
      { qrRow: qrLockRowSent },
      { findActive: async () => null },
    );
    await expect(uc.execute(USER_ID, QR_ID)).rejects.toBeInstanceOf(QrNotFoundError);
  });
});
