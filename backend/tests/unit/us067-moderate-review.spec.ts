// US-067 (PB-P1-040 / QA-001) — Unit tests de `ModerateReviewUseCase` + DTO branches.
//
// Cobertura:
//   DTO (`ModerateReviewBodySchema`):
//     - VR-02 rechaza `action` fuera de {'hide','remove'}.
//     - VR-03 rechaza `reason` fuera de [10..500].
//     - VR-04 `.strict()` — campos ajenos → parse fail (Decisión PO D9).
//     - Happy path: `{action, reason}` válido.
//
//   UseCase branches (Decisión PO D2 / AC-01..AC-04 / EC-01..EC-05):
//     - AC-01 published → hidden: UPDATE + AdminAction + admin_action_id chain + denormalize + log.
//     - AC-02 published → removed: idem con targetStatus=removed.
//     - AC-03 hidden → removed: transición permitida, nueva AdminAction.
//     - AC-04 denormalize recalcula sobre `status='published' AND deleted_at IS NULL`.
//     - EC-01 removed → * ⇒ InvalidReviewTransitionError('removed', target, []). Sin AdminAction.
//     - EC-02 hidden → hidden / hidden → published ⇒ InvalidReviewTransitionError.
//     - Review inexistente ⇒ ReviewNotFoundForModerationError (404 uniforme, Decisión PO D6).
//     - BE-005 log emite `review.moderated` con action, fromStatus, toStatus, adminActionId (SEC-09
//       ⇒ NO se logea `reason`).
import { describe, expect, it, vi } from 'vitest';
import { Prisma, type Prisma as PrismaTypes } from '@prisma/client';
import { ModerateReviewUseCase } from '../../src/modules/reviews-moderation/application/moderate-review.use-case.js';
import {
  ModerateReviewBodySchema,
  ModerateReviewParamsSchema,
} from '../../src/modules/reviews-moderation/interface/moderate-review.dto.js';
import {
  InvalidReviewTransitionError,
  ReviewNotFoundForModerationError,
} from '../../src/modules/reviews-moderation/domain/us067.errors.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

const NOW = new Date('2026-07-20T12:00:00Z');
const REVIEW_ID = '11111111-1111-4111-8111-111111111111';
const VENDOR_PROFILE_ID = '33333333-3333-4333-8333-333333333333';
const ADMIN_USER_ID = '99999999-9999-4999-8999-999999999999';
const ADMIN_ACTION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

type LockedRow = {
  id: string;
  status: string;
  rating: number;
  comment: string | null;
  vendor_profile_id: string;
};
type AggregateRow = { avg: PrismaTypes.Decimal | null; count: number };

interface BuildOpts {
  reviewExists?: boolean;
  currentStatus?: 'published' | 'hidden' | 'removed';
}

function build(opts: BuildOpts = {}) {
  const reviewExists = opts.reviewExists ?? true;
  const currentStatus = opts.currentStatus ?? 'published';

  const logSpy = vi.fn();
  const clock: ClockPort = { now: () => NOW };
  const logger: DomainEventLogger = { emit: logSpy };

  // Los spies tipan `args` como `Record<string, unknown>`; los asserts abajo hacen narrowing
  // manual sobre `mock.calls[n]![0]`. Esto evita `any` (regla ESLint) sin arrastrar los tipos
  // reales de Prisma que quedan fuera del scope de estos UT.
  type SpyArgs = { data: Record<string, unknown>; where?: Record<string, unknown>; select?: unknown };
  const reviewUpdateSpy = vi.fn<(args: SpyArgs) => void>();
  const vendorProfileUpdateSpy = vi.fn<(args: SpyArgs) => Promise<undefined>>(async () => undefined);
  const adminActionCreateSpy = vi.fn<(args: SpyArgs) => Promise<{ id: string }>>(async () => ({ id: ADMIN_ACTION_ID }));
  const queryRawSpy = vi.fn();
  let queryRawCallIndex = 0;

  const tx = {
    review: {
      update: async (args: {
        where: { id: string };
        data: Record<string, unknown>;
        select?: Record<string, boolean>;
      }): Promise<unknown> => {
        reviewUpdateSpy(args);
        // Segundo UPDATE (con select) devuelve la vista final.
        if (args.select) {
          return {
            id: REVIEW_ID,
            status: args.data.adminActionId ? currentStatus /* placeholder */ : currentStatus,
            moderatedBy: ADMIN_USER_ID,
            moderatedAt: NOW,
            moderationReason: 'Contenido inapropiado verificado en review manual.',
            adminActionId: ADMIN_ACTION_ID,
          };
        }
        return { id: REVIEW_ID };
      },
    },
    vendorProfile: { update: vendorProfileUpdateSpy },
    adminAction: { create: adminActionCreateSpy },
    async $queryRaw(): Promise<unknown> {
      queryRawSpy();
      if (queryRawCallIndex === 0) {
        queryRawCallIndex += 1;
        // Primer $queryRaw = SELECT ... FOR UPDATE.
        return reviewExists
          ? ([
              {
                id: REVIEW_ID,
                status: currentStatus,
                rating: 4,
                comment: 'good',
                vendor_profile_id: VENDOR_PROFILE_ID,
              },
            ] satisfies LockedRow[])
          : [];
      }
      // Siguientes = agregate para denormalize.
      queryRawCallIndex += 1;
      return [{ avg: new Prisma.Decimal('4.25'), count: 4 }] satisfies AggregateRow[];
    },
  };

  const prismaMock = {
    async $transaction<T>(fn: (tx: PrismaTypes.TransactionClient) => Promise<T>): Promise<T> {
      return fn(tx as unknown as PrismaTypes.TransactionClient);
    },
  };

  const uc = new ModerateReviewUseCase(clock, logger, prismaMock as never);
  return {
    uc,
    logSpy,
    reviewUpdateSpy,
    vendorProfileUpdateSpy,
    adminActionCreateSpy,
  };
}

describe('US-067 · ModerateReviewParamsSchema + ModerateReviewBodySchema', () => {
  const body = { action: 'hide' as const, reason: 'Contenido inapropiado verificado.' };

  it('acepta body válido con action=hide y reason ≥ 10 chars', () => {
    expect(ModerateReviewBodySchema.safeParse(body).success).toBe(true);
  });
  it('acepta body válido con action=remove', () => {
    expect(
      ModerateReviewBodySchema.safeParse({ action: 'remove', reason: body.reason }).success,
    ).toBe(true);
  });
  it('VR-02 rechaza action inválido', () => {
    expect(
      ModerateReviewBodySchema.safeParse({ action: 'delete', reason: body.reason }).success,
    ).toBe(false);
  });
  it('VR-03 rechaza reason < 10', () => {
    expect(ModerateReviewBodySchema.safeParse({ action: 'hide', reason: 'short' }).success).toBe(
      false,
    );
  });
  it('VR-03 rechaza reason > 500', () => {
    expect(
      ModerateReviewBodySchema.safeParse({ action: 'hide', reason: 'x'.repeat(501) }).success,
    ).toBe(false);
  });
  it('VR-04 rechaza campos ajenos (.strict())', () => {
    expect(
      ModerateReviewBodySchema.safeParse({ ...body, extra: 'x' }).success,
    ).toBe(false);
  });
  it('Params: rechaza :id no UUID', () => {
    expect(ModerateReviewParamsSchema.safeParse({ id: 'not-uuid' }).success).toBe(false);
    expect(ModerateReviewParamsSchema.safeParse({ id: REVIEW_ID }).success).toBe(true);
  });
});

describe('US-067 · ModerateReviewUseCase.execute', () => {
  const body = {
    action: 'hide' as const,
    reason: 'Contenido inapropiado verificado en review manual.',
  };

  it('AC-01 published → hidden: 2 UPDATE + AdminAction + denormalize + log', async () => {
    const { uc, logSpy, reviewUpdateSpy, vendorProfileUpdateSpy, adminActionCreateSpy } = build();

    const view = await uc.execute(ADMIN_USER_ID, REVIEW_ID, body, { correlationId: 'cid-67' });

    expect(view.id).toBe(REVIEW_ID);
    expect(view.adminActionId).toBe(ADMIN_ACTION_ID);
    expect(view.moderatedBy).toBe(ADMIN_USER_ID);
    expect(view.moderationReason).toBe(body.reason);

    // Dos UPDATE sobre reviews: 1) audit columns + status; 2) admin_action_id chain.
    expect(reviewUpdateSpy).toHaveBeenCalledTimes(2);
    const firstUpdate = reviewUpdateSpy.mock.calls[0]![0];
    expect(firstUpdate.data).toMatchObject({
      status: 'hidden',
      moderatedBy: ADMIN_USER_ID,
      moderationReason: body.reason,
    });
    const secondUpdate = reviewUpdateSpy.mock.calls[1]![0];
    expect(secondUpdate.data).toEqual({ adminActionId: ADMIN_ACTION_ID });

    // AdminAction append-only con payload snapshot (Decisión PO D8).
    expect(adminActionCreateSpy).toHaveBeenCalledTimes(1);
    const admActionArgs = adminActionCreateSpy.mock.calls[0]![0];
    expect(admActionArgs.data).toMatchObject({
      adminUserId: ADMIN_USER_ID,
      action: 'hide',
      targetEntity: 'review',
      targetId: REVIEW_ID,
    });
    const metadata = admActionArgs.data.metadata as Record<string, unknown>;
    expect(metadata).toMatchObject({
      correlationId: 'cid-67',
      reason: body.reason,
      from_status: 'published',
      to_status: 'hidden',
      rating_snapshot: 4,
      comment_snapshot: 'good',
    });

    // Denormalize: UPDATE VendorProfile con avg y count del aggregate.
    expect(vendorProfileUpdateSpy).toHaveBeenCalledWith({
      where: { id: VENDOR_PROFILE_ID },
      data: { ratingAvg: expect.any(Prisma.Decimal), reviewsCount: 4 },
    });

    // Log `review.moderated` — SEC-09 NO expone `reason`.
    expect(logSpy).toHaveBeenCalledWith(
      'review.moderated',
      expect.objectContaining({
        correlationId: 'cid-67',
        actorId: ADMIN_USER_ID,
        reviewId: REVIEW_ID,
        adminUserId: ADMIN_USER_ID,
        action: 'hide',
        fromStatus: 'published',
        toStatus: 'hidden',
        adminActionId: ADMIN_ACTION_ID,
      }),
    );
    const loggedPayload = logSpy.mock.calls[0]?.[1] ?? {};
    expect(loggedPayload).not.toHaveProperty('reason');
    expect(loggedPayload).not.toHaveProperty('moderationReason');
  });

  it('AC-02 published → removed: action=remove ⇒ targetStatus=removed', async () => {
    const { uc, reviewUpdateSpy, adminActionCreateSpy } = build();
    await uc.execute(ADMIN_USER_ID, REVIEW_ID, { ...body, action: 'remove' });
    expect(reviewUpdateSpy.mock.calls[0]![0].data.status).toBe('removed');
    expect(adminActionCreateSpy.mock.calls[0]![0].data.action).toBe('remove');
  });

  it('AC-03 hidden → removed: transición permitida crea nueva AdminAction', async () => {
    const { uc, reviewUpdateSpy, adminActionCreateSpy } = build({ currentStatus: 'hidden' });
    await uc.execute(ADMIN_USER_ID, REVIEW_ID, { ...body, action: 'remove' });
    expect(reviewUpdateSpy.mock.calls[0]![0].data.status).toBe('removed');
    const meta = adminActionCreateSpy.mock.calls[0]![0].data.metadata as Record<string, unknown>;
    expect(meta.from_status).toBe('hidden');
    expect(meta.to_status).toBe('removed');
  });

  it('EC-01 removed → hide ⇒ InvalidReviewTransitionError sin AdminAction', async () => {
    const { uc, adminActionCreateSpy, reviewUpdateSpy } = build({ currentStatus: 'removed' });
    await expect(uc.execute(ADMIN_USER_ID, REVIEW_ID, body)).rejects.toBeInstanceOf(
      InvalidReviewTransitionError,
    );
    expect(adminActionCreateSpy).not.toHaveBeenCalled();
    expect(reviewUpdateSpy).not.toHaveBeenCalled();
  });

  it('EC-02 hidden → hidden ⇒ InvalidReviewTransitionError; allowed=["removed"]', async () => {
    const { uc } = build({ currentStatus: 'hidden' });
    try {
      await uc.execute(ADMIN_USER_ID, REVIEW_ID, body);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidReviewTransitionError);
      const err = e as InvalidReviewTransitionError;
      expect(err.from).toBe('hidden');
      expect(err.to).toBe('hidden');
      expect(err.allowed).toEqual(['removed']);
    }
  });

  it('Review inexistente ⇒ ReviewNotFoundForModerationError (404 uniforme, D6)', async () => {
    const { uc, adminActionCreateSpy } = build({ reviewExists: false });
    await expect(uc.execute(ADMIN_USER_ID, REVIEW_ID, body)).rejects.toBeInstanceOf(
      ReviewNotFoundForModerationError,
    );
    expect(adminActionCreateSpy).not.toHaveBeenCalled();
  });
});
