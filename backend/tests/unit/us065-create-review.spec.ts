// US-065 (PB-P1-038 / QA-001) — Unit tests del CreateReviewUseCase + DTO branches.
//
// Cobertura:
//   DTO:
//     - EC-04 rating fuera de rango (0, 6, decimal) → parse fail.
//     - EC-05 comment > 2000 chars → parse fail.
//     - VR-03 event_id/vendor_profile_id no UUID → parse fail.
//     - VR-04 `.strict()` — campos ajenos → parse fail.
//     - Happy path: rating 1..5 + comment opcional.
//
//   UseCase branches:
//     - AC-01 happy path: INSERT review + denormalize + emit vendor + log.
//     - AC-02 comment ausente ⇒ persiste null; string vacío/whitespace ⇒ null.
//     - AC-03 review previa activa ⇒ ReviewNotEligibleError('already_reviewed').
//     - EC-01 sin BookingIntent confirmed_intent ⇒ ReviewNotEligibleError('no_booking').
//     - EC-02 event.completedAt IS NULL ⇒ ReviewNotEligibleError('event_not_completed').
//     - EC-03 ventana > 30 días ⇒ ReviewNotEligibleError('window_expired').
//     - EC-06 event inexistente ⇒ ReviewTargetNotFoundError.
//     - EC-06 vendor inexistente ⇒ ReviewTargetNotFoundError.
//     - EC-07 organizer ajeno al evento ⇒ ReviewTargetNotFoundError (uniforme).
//     - BE-005 log emite 5 campos: reviewId, vendorProfileId, eventId, organizerUserId, rating.
import { describe, expect, it, vi } from 'vitest';
import { Prisma, type Prisma as PrismaTypes } from '@prisma/client';
import { CreateReviewUseCase } from '../../src/modules/reviews-moderation/application/create-review.use-case.js';
import { CreateReviewRequestSchema } from '../../src/modules/reviews-moderation/interface/create-review.dto.js';
import { ReviewTargetNotFoundError } from '../../src/modules/reviews-moderation/domain/us065.errors.js';
import type {
  EmitReviewEventInput,
  ReviewEventNotifierPort,
} from '../../src/modules/reviews-moderation/ports/review-event-notifier.port.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

const NOW = new Date('2026-07-20T12:00:00Z');
const REVIEW_ID = '11111111-1111-4111-8111-111111111111';
const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const VENDOR_PROFILE_ID = '33333333-3333-4333-8333-333333333333';
const BOOKING_INTENT_ID = '44444444-4444-4444-8444-444444444444';
const ORGANIZER_USER_ID = '55555555-5555-4555-8555-555555555555';
const OTHER_ORGANIZER_USER_ID = '66666666-6666-4666-8666-666666666666';
const VENDOR_USER_ID = '77777777-7777-4777-8777-777777777777';

interface BuildOpts {
  eventExists?: boolean;
  eventOwnerId?: string;
  eventCompletedAt?: Date | null;
  vendorExists?: boolean;
  confirmedBookingExists?: boolean;
  existingReviewId?: string | null;
}

function build(opts: BuildOpts = {}) {
  const emitSpy = vi.fn(async (_input: EmitReviewEventInput): Promise<void> => undefined);
  const logSpy = vi.fn();
  const clock: ClockPort = { now: () => NOW };
  const logger: DomainEventLogger = { emit: logSpy };
  const notifications: ReviewEventNotifierPort = { emit: emitSpy };

  const eventExists = opts.eventExists ?? true;
  const eventOwnerId = opts.eventOwnerId ?? ORGANIZER_USER_ID;
  const eventCompletedAt =
    opts.eventCompletedAt === undefined
      ? new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000)
      : opts.eventCompletedAt;
  const vendorExists = opts.vendorExists ?? true;
  const confirmedBookingExists = opts.confirmedBookingExists ?? true;
  const existingReviewId = opts.existingReviewId === undefined ? null : opts.existingReviewId;

  const updatedVendorProfile = vi.fn(async () => undefined);
  const aggregateResult = [{ avg: new Prisma.Decimal('4.20'), count: 5 }];

  const tx = {
    event: {
      findUnique: async (): Promise<unknown> =>
        eventExists ? { id: EVENT_ID, userId: eventOwnerId, completedAt: eventCompletedAt } : null,
    },
    vendorProfile: {
      findUnique: async (): Promise<unknown> =>
        vendorExists ? { id: VENDOR_PROFILE_ID, userId: VENDOR_USER_ID } : null,
      update: updatedVendorProfile,
    },
    bookingIntent: {
      findFirst: async (): Promise<unknown> =>
        confirmedBookingExists ? { id: BOOKING_INTENT_ID } : null,
    },
    review: {
      findFirst: async (): Promise<unknown> =>
        existingReviewId ? { id: existingReviewId } : null,
      create: async (args: { data: Record<string, unknown> }): Promise<unknown> => ({
        id: REVIEW_ID,
        bookingIntentId: args.data.bookingIntentId,
        vendorProfileId: args.data.vendorProfileId,
        authorId: args.data.authorId,
        rating: args.data.rating,
        comment: args.data.comment ?? null,
        status: 'published',
        createdAt: NOW,
        updatedAt: NOW,
      }),
    },
    async $queryRaw(): Promise<Array<{ avg: PrismaTypes.Decimal | null; count: number }>> {
      return aggregateResult;
    },
  };

  const prismaMock = {
    async $transaction<T>(fn: (tx: PrismaTypes.TransactionClient) => Promise<T>): Promise<T> {
      return fn(tx as unknown as PrismaTypes.TransactionClient);
    },
  };

  const uc = new CreateReviewUseCase(notifications, clock, logger, prismaMock as never);
  return { uc, emitSpy, logSpy, updatedVendorProfile };
}

describe('US-065 · CreateReviewRequestSchema', () => {
  const base = {
    event_id: EVENT_ID,
    vendor_profile_id: VENDOR_PROFILE_ID,
    rating: 4,
  };

  it('acepta body válido con comment', () => {
    expect(
      CreateReviewRequestSchema.safeParse({ ...base, comment: 'Excelente' }).success,
    ).toBe(true);
  });
  it('acepta body válido sin comment', () => {
    expect(CreateReviewRequestSchema.safeParse(base).success).toBe(true);
  });
  it('EC-04 rechaza rating fuera de 1..5', () => {
    expect(CreateReviewRequestSchema.safeParse({ ...base, rating: 0 }).success).toBe(false);
    expect(CreateReviewRequestSchema.safeParse({ ...base, rating: 6 }).success).toBe(false);
  });
  it('EC-04 rechaza rating decimal', () => {
    expect(CreateReviewRequestSchema.safeParse({ ...base, rating: 3.5 }).success).toBe(false);
  });
  it('EC-05 rechaza comment > 2000 chars', () => {
    expect(
      CreateReviewRequestSchema.safeParse({ ...base, comment: 'x'.repeat(2001) }).success,
    ).toBe(false);
  });
  it('VR-03 rechaza event_id no UUID', () => {
    expect(
      CreateReviewRequestSchema.safeParse({ ...base, event_id: 'not-a-uuid' }).success,
    ).toBe(false);
  });
  it('VR-04 rechaza campos ajenos (.strict())', () => {
    expect(
      CreateReviewRequestSchema.safeParse({ ...base, extra: 'x' }).success,
    ).toBe(false);
  });
});

describe('US-065 · CreateReviewUseCase.execute', () => {
  const body = {
    event_id: EVENT_ID,
    vendor_profile_id: VENDOR_PROFILE_ID,
    rating: 4,
    comment: 'Servicio excelente',
  };

  it('AC-01 happy path: INSERT + denormalize + emit vendor + log', async () => {
    const { uc, emitSpy, logSpy, updatedVendorProfile } = build();
    const view = await uc.execute(ORGANIZER_USER_ID, body, { correlationId: 'cid-1' });

    expect(view.id).toBe(REVIEW_ID);
    expect(view.rating).toBe(4);
    expect(view.status).toBe('published');
    expect(view.eventId).toBe(EVENT_ID);
    expect(view.bookingIntentId).toBe(BOOKING_INTENT_ID);
    expect(view.authorUserId).toBe(ORGANIZER_USER_ID);

    // Denormalize: UPDATE VendorProfile con avg y count del agregate.
    expect(updatedVendorProfile).toHaveBeenCalledWith({
      where: { id: VENDOR_PROFILE_ID },
      data: { ratingAvg: expect.any(Prisma.Decimal), reviewsCount: 5 },
    });

    // Emit al vendor.
    expect(emitSpy).toHaveBeenCalledTimes(1);
    const emitCall = emitSpy.mock.calls[0]?.[0];
    expect(emitCall?.eventName).toBe('review.published');
    expect(emitCall?.recipientUserId).toBe(VENDOR_USER_ID);
    expect(emitCall?.correlationId).toBe('cid-1');
    expect(emitCall?.payload).toMatchObject({
      review_id: REVIEW_ID,
      event_id: EVENT_ID,
      vendor_profile_id: VENDOR_PROFILE_ID,
      rating: 4,
      has_comment: true,
    });

    // Log con los 5 campos exigidos por Tech Spec §14.
    expect(logSpy).toHaveBeenCalledWith(
      'review.published',
      expect.objectContaining({
        reviewId: REVIEW_ID,
        vendorProfileId: VENDOR_PROFILE_ID,
        eventId: EVENT_ID,
        organizerUserId: ORGANIZER_USER_ID,
        rating: 4,
      }),
    );
  });

  it('AC-02 comment ausente ⇒ persiste null', async () => {
    const { uc, emitSpy } = build();
    const view = await uc.execute(ORGANIZER_USER_ID, { ...body, comment: undefined });
    expect(view.comment).toBeNull();
    const emitCall = emitSpy.mock.calls[0]?.[0];
    expect(emitCall?.payload).toMatchObject({ has_comment: false });
  });

  it('AC-02 comment vacío ⇒ persiste null', async () => {
    const { uc } = build();
    const view = await uc.execute(ORGANIZER_USER_ID, { ...body, comment: '   ' });
    expect(view.comment).toBeNull();
  });

  it('AC-03 review previa activa ⇒ REVIEW_NOT_ELIGIBLE reason=already_reviewed', async () => {
    const { uc } = build({ existingReviewId: 'existing-review-id' });
    await expect(uc.execute(ORGANIZER_USER_ID, body)).rejects.toMatchObject({
      code: 'REVIEW_NOT_ELIGIBLE',
      reason: 'already_reviewed',
    });
  });

  it('EC-01 sin BookingIntent confirmed_intent ⇒ REVIEW_NOT_ELIGIBLE reason=no_booking', async () => {
    const { uc } = build({ confirmedBookingExists: false });
    await expect(uc.execute(ORGANIZER_USER_ID, body)).rejects.toMatchObject({
      code: 'REVIEW_NOT_ELIGIBLE',
      reason: 'no_booking',
    });
  });

  it('EC-02 event.completedAt IS NULL ⇒ REVIEW_NOT_ELIGIBLE reason=event_not_completed', async () => {
    const { uc } = build({ eventCompletedAt: null });
    await expect(uc.execute(ORGANIZER_USER_ID, body)).rejects.toMatchObject({
      code: 'REVIEW_NOT_ELIGIBLE',
      reason: 'event_not_completed',
    });
  });

  it('EC-03 ventana > 30 días ⇒ REVIEW_NOT_ELIGIBLE reason=window_expired', async () => {
    const thirtyOneDaysAgo = new Date(NOW.getTime() - 31 * 24 * 60 * 60 * 1000);
    const { uc } = build({ eventCompletedAt: thirtyOneDaysAgo });
    await expect(uc.execute(ORGANIZER_USER_ID, body)).rejects.toMatchObject({
      code: 'REVIEW_NOT_ELIGIBLE',
      reason: 'window_expired',
    });
  });

  it('EC-06 event inexistente ⇒ 404 uniforme', async () => {
    const { uc } = build({ eventExists: false });
    await expect(uc.execute(ORGANIZER_USER_ID, body)).rejects.toBeInstanceOf(
      ReviewTargetNotFoundError,
    );
  });

  it('EC-06 vendor inexistente ⇒ 404 uniforme', async () => {
    const { uc } = build({ vendorExists: false });
    await expect(uc.execute(ORGANIZER_USER_ID, body)).rejects.toBeInstanceOf(
      ReviewTargetNotFoundError,
    );
  });

  it('EC-07 organizer ajeno ⇒ 404 uniforme (masking)', async () => {
    const { uc } = build({ eventOwnerId: OTHER_ORGANIZER_USER_ID });
    await expect(uc.execute(ORGANIZER_USER_ID, body)).rejects.toBeInstanceOf(
      ReviewTargetNotFoundError,
    );
  });

  it('BE-002 fan-out participa en la misma tx (fallo del emit revierte todo)', async () => {
    const notifications: ReviewEventNotifierPort = {
      emit: vi.fn(async () => {
        throw new Error('notification-failed');
      }),
    };
    const clock: ClockPort = { now: () => NOW };
    const logger: DomainEventLogger = { emit: vi.fn() };

    const createReviewSpy = vi.fn(async (args: { data: Record<string, unknown> }) => ({
      id: REVIEW_ID,
      bookingIntentId: args.data.bookingIntentId,
      vendorProfileId: args.data.vendorProfileId,
      authorId: args.data.authorId,
      rating: args.data.rating,
      comment: args.data.comment ?? null,
      status: 'published',
      createdAt: NOW,
      updatedAt: NOW,
    }));

    const tx = {
      event: {
        findUnique: async () => ({
          id: EVENT_ID,
          userId: ORGANIZER_USER_ID,
          completedAt: new Date(NOW.getTime() - 60 * 60 * 1000),
        }),
      },
      vendorProfile: {
        findUnique: async () => ({ id: VENDOR_PROFILE_ID, userId: VENDOR_USER_ID }),
        update: async () => undefined,
      },
      bookingIntent: { findFirst: async () => ({ id: BOOKING_INTENT_ID }) },
      review: {
        findFirst: async () => null,
        create: createReviewSpy,
      },
      $queryRaw: async () => [{ avg: new Prisma.Decimal('4.20'), count: 5 }],
    };

    const prismaMock = {
      async $transaction<T>(fn: (tx: PrismaTypes.TransactionClient) => Promise<T>): Promise<T> {
        return fn(tx as unknown as PrismaTypes.TransactionClient);
      },
    };

    const uc = new CreateReviewUseCase(notifications, clock, logger, prismaMock as never);
    await expect(uc.execute(ORGANIZER_USER_ID, body)).rejects.toThrow('notification-failed');
    // El fallo del emit propagó ⇒ transacción abortada (create fue invocado dentro del try).
    expect(createReviewSpy).toHaveBeenCalledTimes(1);
  });
});
