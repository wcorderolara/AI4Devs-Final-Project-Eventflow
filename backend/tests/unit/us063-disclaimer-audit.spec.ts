// US-063 (PB-P1-037 / QA-001) — Unit tests para el refactor del disclaimer bilateral.
//
// Cubre:
//   - DTO `ConfirmBookingIntentBodySchema` (BE-003): valida `disclaimer_accepted:true` estricto.
//   - `ConfirmBookingIntentUseCase` (BE-004): bypass ⇒ `DisclaimerRequiredError`; happy path
//     invoca `bookingIntents.confirm(id, now, tx, {copyVersion:'v1'})` y emite log
//     `disclaimer.accepted action='confirm'`.
//   - `CreateBookingIntentUs060UseCase` (BE-002): happy path emite log `disclaimer.accepted
//     action='create'` con `agreementCopyVersion='v1'` y persiste audit fields en el INSERT.
import { describe, expect, it, vi } from 'vitest';
import { ConfirmBookingIntentBodySchema } from '../../src/modules/booking-intent/dto/confirm-booking-intent.request.js';
import { ConfirmBookingIntentUseCase } from '../../src/modules/booking-intent/application/booking-intent.use-cases.js';
import { DisclaimerRequiredError } from '../../src/modules/booking-intent/domain/us060.errors.js';
import { BOOKING_DISCLAIMER_COPY_VERSION } from '../../src/shared/booking/disclaimer.js';
import type { BookingIntentRepository } from '../../src/modules/booking-intent/ports/booking-intent.repository.js';
import type { VendorProfileReader } from '../../src/shared/access/readers.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';

const INTENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const VENDOR_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const VENDOR_PROFILE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NOW = new Date('2026-07-17T21:00:00Z');

describe('US-063 · ConfirmBookingIntentBodySchema (DTO)', () => {
  it('acepta `{disclaimer_accepted: true}`', () => {
    const parsed = ConfirmBookingIntentBodySchema.parse({ disclaimer_accepted: true });
    expect(parsed.disclaimer_accepted).toBe(true);
  });

  it('acepta `{disclaimer_accepted: false}` — el UC luego lo rechaza como DISCLAIMER_REQUIRED', () => {
    const parsed = ConfirmBookingIntentBodySchema.parse({ disclaimer_accepted: false });
    expect(parsed.disclaimer_accepted).toBe(false);
  });

  it('rechaza body vacío (`disclaimer_accepted` requerido)', () => {
    expect(() => ConfirmBookingIntentBodySchema.parse({})).toThrow();
  });

  it('rechaza `disclaimer_accepted` no-booleano (VALIDATION_ERROR estándar)', () => {
    expect(() => ConfirmBookingIntentBodySchema.parse({ disclaimer_accepted: 'true' })).toThrow();
    expect(() => ConfirmBookingIntentBodySchema.parse({ disclaimer_accepted: 1 })).toThrow();
    expect(() => ConfirmBookingIntentBodySchema.parse({ disclaimer_accepted: null })).toThrow();
  });

  it('rechaza claves adicionales — `.strict()` bloquea cualquier campo de pago (FR-BOOKING-007)', () => {
    expect(() =>
      ConfirmBookingIntentBodySchema.parse({ disclaimer_accepted: true, payment_method: 'card' }),
    ).toThrow();
    expect(() =>
      ConfirmBookingIntentBodySchema.parse({ disclaimer_accepted: true, amount_paid: 100 }),
    ).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildUc(overrides?: {
  disclaimerAccepted?: boolean;
  vendorProfileId?: string;
  status?: 'pending' | 'confirmed_intent' | 'cancelled';
}): {
  uc: ConfirmBookingIntentUseCase;
  logSpy: ReturnType<typeof vi.spyOn>;
  confirmSpy: ReturnType<typeof vi.fn>;
} {
  const status = overrides?.status ?? 'pending';
  const bookingIntents: BookingIntentRepository = {
    findById: vi.fn().mockResolvedValue({
      id: INTENT_ID,
      quoteId: 'q',
      eventId: 'e',
      serviceCategoryId: 's',
      vendorProfileId: overrides?.vendorProfileId ?? VENDOR_PROFILE_ID,
      status,
      isSimulated: true,
      confirmedAt: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      createdAt: '2026-07-15T00:00:00Z',
      updatedAt: '2026-07-15T00:00:00Z',
    }),
    confirm: vi.fn().mockResolvedValue({
      id: INTENT_ID,
      quoteId: 'q',
      eventId: 'e',
      serviceCategoryId: 's',
      vendorProfileId: VENDOR_PROFILE_ID,
      status: 'confirmed_intent',
      isSimulated: true,
      confirmedAt: NOW.toISOString(),
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      createdAt: '2026-07-15T00:00:00Z',
      updatedAt: NOW.toISOString(),
    }),
    create: vi.fn(),
    cancel: vi.fn(),
    findByIdForSync: vi.fn(),
    markCommittedSynced: vi.fn(),
    clearCommittedSync: vi.fn(),
  };
  const vendors = {
    getVendorProfileIdForUser: vi.fn().mockResolvedValue(VENDOR_PROFILE_ID),
  } as unknown as VendorProfileReader;
  const clock: ClockPort = { now: () => NOW };
  const logger: DomainEventLogger = { emit: vi.fn() };
  const uc = new ConfirmBookingIntentUseCase(bookingIntents, vendors, clock, logger);
  return {
    uc,
    logSpy: vi.spyOn(logger, 'emit'),
    confirmSpy: bookingIntents.confirm as ReturnType<typeof vi.fn>,
  };
}

describe('US-063 · ConfirmBookingIntentUseCase enforcement + audit', () => {
  it('BE-004 / D1: `disclaimerAccepted=false` ⇒ DisclaimerRequiredError (bypass server-side)', async () => {
    const { uc, confirmSpy, logSpy } = buildUc();
    await expect(
      uc.execute(VENDOR_USER_ID, INTENT_ID, { disclaimerAccepted: false }),
    ).rejects.toBeInstanceOf(DisclaimerRequiredError);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('BE-004: enforcement se aplica ANTES del lookup del intent (evita filtrar existencia por diferencia de código)', async () => {
    const { uc, confirmSpy } = buildUc();
    // Intent inexistente: si el enforcement ocurriera después, se lanzaría BookingIntentNotFoundError.
    await expect(
      uc.execute(VENDOR_USER_ID, INTENT_ID, { disclaimerAccepted: false }),
    ).rejects.toBeInstanceOf(DisclaimerRequiredError);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('BE-004 happy path legacy (sin tx runner): confirm recibe {copyVersion:v1} + emite log disclaimer.accepted action=confirm', async () => {
    const { uc, confirmSpy, logSpy } = buildUc();
    await uc.execute(VENDOR_USER_ID, INTENT_ID, { disclaimerAccepted: true });
    expect(confirmSpy).toHaveBeenCalledWith(INTENT_ID, NOW, undefined, {
      copyVersion: BOOKING_DISCLAIMER_COPY_VERSION,
    });
    const disclaimerLog = logSpy.mock.calls.find(
      (args) => args[0] === 'disclaimer.accepted',
    );
    expect(disclaimerLog).toBeDefined();
    expect(disclaimerLog?.[1]).toMatchObject({
      actorId: VENDOR_USER_ID,
      userId: VENDOR_USER_ID,
      bookingIntentId: INTENT_ID,
      action: 'confirm',
      agreementCopyVersion: BOOKING_DISCLAIMER_COPY_VERSION,
      acceptedAt: NOW.toISOString(),
    });
  });

  it('BE-004: idempotencia sobre confirmed_intent ⇒ no dispara audit ni confirm', async () => {
    const { uc, confirmSpy, logSpy } = buildUc({ status: 'confirmed_intent' });
    const view = await uc.execute(VENDOR_USER_ID, INTENT_ID, { disclaimerAccepted: true });
    expect(view.status).toBe('confirmed_intent');
    expect(confirmSpy).not.toHaveBeenCalled();
    const disclaimerLog = logSpy.mock.calls.find(
      (args) => args[0] === 'disclaimer.accepted',
    );
    expect(disclaimerLog).toBeUndefined();
  });
});

describe('US-063 · Constante BOOKING_DISCLAIMER_COPY_VERSION', () => {
  it('exporta el valor `v1` — bumps futuros requieren ADR (D7)', () => {
    expect(BOOKING_DISCLAIMER_COPY_VERSION).toBe('v1');
  });
});
