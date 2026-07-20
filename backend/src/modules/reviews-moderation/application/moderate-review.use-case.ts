// ModerateReviewUseCase (US-067 / BE-003). Tech Spec §7 UseCase. AC-01..AC-04 + EC-01..EC-05.
//
// Endpoint atómico `POST /api/v1/admin/reviews/:id/moderate` (Decisiones PO D4/D8) que ejecuta
// dentro de un único `prisma.$transaction`:
//
//   1. Bloqueo pesimista de la review por `SELECT ... FOR UPDATE` (Tech Spec §17 mitigación
//      de la race de 2 moderate simultáneos — Decisión PO D2). Sin lock, dos admins podrían
//      crear 2 AdminActions y duplicar el denormalize. Uniforme 404 `REVIEW_NOT_FOUND` si el
//      UUID no matchea (SEC-05 + Decisión PO D6).
//   2. Validación de transición contra el whitelist estricto (Decisión PO D2):
//        - `published → hidden`   ✅
//        - `published → removed`  ✅
//        - `hidden    → removed`  ✅
//        - `removed   → *`        ❌ 409 INVALID_TRANSITION (EC-01, `removed` es final por
//          SEC-03 / FR-REVIEW-005 — soft delete no reversible en MVP; US-077 podrá manejarlo).
//        - `hidden    → published`, `hidden → hidden`, etc. ❌ 409 INVALID_TRANSITION (EC-02).
//        Cualquier rechazo pre-INSERT ⇒ NO se crea AdminAction (BR-ADMIN-011 se preserva:
//        sólo hay AdminAction si hubo mutación efectiva).
//   3. UPDATE review — `status`, `moderated_by`, `moderated_at`, `moderation_reason`. El
//      `admin_action_id` se llenará en el paso 5 (una vez insertado el AdminAction, para evitar
//      dependencia circular).
//   4. INSERT AdminAction (append-only, BR-ADMIN-011). Shape (Decisión PO D8):
//        `{admin_id, target_type='review', target_id, action: 'hide'|'remove', reason,
//          payload: {from_status, to_status, rating_snapshot, comment_snapshot}}`.
//      El snapshot `rating`/`comment` en `metadata` preserva el estado pre-moderación aunque
//      la review sea moderada más tarde por otro admin (Tech Spec §17 "AdminAction sin payload
//      snapshot"). `correlationId` viaja dentro de `metadata` (misma deviation que US-016).
//   5. UPDATE review.admin_action_id — enlace de cadena review→AdminAction (Decisión PO D3/D8;
//      BR-ADMIN-011). Un segundo UPDATE mínimo dentro de la misma transacción; barato porque
//      la review ya está lockeada.
//   6. Recálculo TOTAL denormalize `VendorProfile.rating_avg + reviews_count` sobre reviews
//      `status='published' AND deleted_at IS NULL` (Decisión PO D1: `hidden`/`removed` fuera
//      del avg — BR-REVIEW-009 + FR-VENDOR-013 + AC-04). Se usa raw SQL con `ROUND(...,2)` para
//      paridad exacta con `numeric(3,2)` (misma técnica de US-065 BE-003 §9).
//   7. Log estructurado `review.moderated` con 5 campos + `adminActionId` (Tech Spec §14). NO
//      se logea el `reason` (SEC-09: puede contener PII/contenido reportado).
//
// Errores mapeados por el `errorHandlerMiddleware`:
//   - `ReviewNotFoundForModerationError → 404 REVIEW_NOT_FOUND` (Decisión PO D6; SEC-05 uniforme).
//   - `InvalidReviewTransitionError → 409 INVALID_TRANSITION` con
//     `details = [{from},{to},{allowed}]` (EC-01/EC-02).
//
// NO invoca a ningún AI provider (FR-REVIEW-009). NO ejecuta hard delete (FR-REVIEW-005; el
// `status='removed'` es soft delete final). NO envía notif al organizer/vendor en MVP
// (Decisión PO D7).
import { Prisma, ReviewStatus, type PrismaClient } from '@prisma/client';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import {
  InvalidReviewTransitionError,
  ReviewNotFoundForModerationError,
} from '../domain/us067.errors.js';
import type { ModerateReviewBody } from '../interface/moderate-review.dto.js';

export interface ModerateReviewCtx {
  correlationId?: string;
}

export interface ModeratedReviewView {
  id: string;
  status: 'hidden' | 'removed';
  moderatedAt: string;
  moderatedBy: string;
  moderationReason: string;
  adminActionId: string;
}

/** Whitelist explícita (Decisión PO D2). `removed` es terminal — no hay salida por SEC-03. */
const ALLOWED_TRANSITIONS: Record<string, ReadonlyArray<'hidden' | 'removed'>> = {
  published: ['hidden', 'removed'],
  hidden: ['removed'],
  removed: [],
};

interface AggregateRow {
  avg: Prisma.Decimal | null;
  count: number;
}

interface LockedReviewRow {
  id: string;
  status: string;
  rating: number;
  comment: string | null;
  vendor_profile_id: string;
}

export class ModerateReviewUseCase {
  constructor(
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    reviewId: string,
    body: ModerateReviewBody,
    ctx: ModerateReviewCtx = {},
  ): Promise<ModeratedReviewView> {
    const now = this.clock.now();

    return this.prisma.$transaction(async (tx) => {
      // 1) Bloqueo pesimista: `SELECT ... FOR UPDATE` sobre la fila objetivo. Prisma no expone
      // FOR UPDATE de forma tipada — se usa raw SQL scoped al mismo `tx` (misma técnica de
      // otras use cases del repo). La ausencia de fila ⇒ 404 uniforme.
      const locked = await tx.$queryRaw<LockedReviewRow[]>(
        Prisma.sql`SELECT id, status, rating, comment, vendor_profile_id
                     FROM reviews
                    WHERE id = ${reviewId}::uuid
                      AND deleted_at IS NULL
                    FOR UPDATE`,
      );
      const review = locked[0];
      if (!review) throw new ReviewNotFoundForModerationError();

      const fromStatus = review.status;
      const targetStatus: 'hidden' | 'removed' = body.action === 'hide' ? 'hidden' : 'removed';

      // 2) Validación de transición contra whitelist (Decisión PO D2).
      const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];
      if (!allowed.includes(targetStatus)) {
        throw new InvalidReviewTransitionError(fromStatus, targetStatus, [...allowed]);
      }

      // 3) UPDATE review (fields excepto admin_action_id — se enlaza en el paso 5).
      await tx.review.update({
        where: { id: reviewId },
        data: {
          status: ReviewStatus[targetStatus],
          moderatedBy: currentUserId,
          moderatedAt: now,
          moderationReason: body.reason,
        },
      });

      // 4) INSERT AdminAction (append-only, BR-ADMIN-011). Payload snapshot en `metadata`.
      // `correlationId` va dentro de `metadata` mientras `admin_actions.correlation_id` no
      // exista como columna dedicada (deviation D-01 de US-016 — escalado a US-099).
      const adminAction = await tx.adminAction.create({
        data: {
          adminUserId: currentUserId,
          action: body.action,
          targetEntity: 'review',
          targetId: reviewId,
          metadata: {
            correlationId: ctx.correlationId ?? null,
            reason: body.reason,
            from_status: fromStatus,
            to_status: targetStatus,
            rating_snapshot: review.rating,
            comment_snapshot: review.comment,
          } as Prisma.InputJsonObject,
        },
        select: { id: true },
      });

      // 5) UPDATE review.admin_action_id — enlace de cadena review → último AdminAction
      // (Decisión PO D3/D8; BR-ADMIN-011).
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: { adminActionId: adminAction.id },
        select: {
          id: true,
          status: true,
          moderatedBy: true,
          moderatedAt: true,
          moderationReason: true,
          adminActionId: true,
        },
      });

      // 6) Recálculo TOTAL denormalize VendorProfile (Decisión PO D1 + AC-04). `hidden` y
      // `removed` quedan fuera del avg/count.
      const aggregate = await tx.$queryRaw<AggregateRow[]>(
        Prisma.sql`SELECT ROUND(AVG(rating)::numeric, 2) AS "avg",
                          COUNT(id)::int              AS "count"
                     FROM reviews
                    WHERE vendor_profile_id = ${review.vendor_profile_id}::uuid
                      AND status = 'published'
                      AND deleted_at IS NULL`,
      );
      const stats = aggregate[0] ?? { avg: null, count: 0 };

      await tx.vendorProfile.update({
        where: { id: review.vendor_profile_id },
        data: {
          ratingAvg: stats.avg ?? null,
          reviewsCount: stats.count,
        },
      });

      // 7) Log estructurado `review.moderated` — Tech Spec §14. SEC-09: NO se emite `reason`
      // (puede contener PII / referencia a contenido reportado).
      this.logger.emit('review.moderated', {
        correlationId: ctx.correlationId,
        actorId: currentUserId,
        reviewId: updated.id,
        adminUserId: currentUserId,
        action: body.action,
        fromStatus,
        toStatus: targetStatus,
        adminActionId: adminAction.id,
      });

      return {
        id: updated.id,
        status: updated.status as 'hidden' | 'removed',
        moderatedAt: (updated.moderatedAt as Date).toISOString(),
        moderatedBy: updated.moderatedBy as string,
        moderationReason: updated.moderationReason as string,
        adminActionId: updated.adminActionId as string,
      };
    });
  }
}
