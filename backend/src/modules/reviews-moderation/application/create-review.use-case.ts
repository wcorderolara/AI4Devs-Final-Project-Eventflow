// CreateReviewUseCase (US-065 / BE-003). Tech Spec §7 UseCase. AC-01..AC-04 + EC-01..EC-07.
//
// Endpoint atómico `POST /api/v1/organizer/reviews` (D9) que ejecuta en un único
// `prisma.$transaction`:
//
//   1. Resuelve el Event target por `body.event_id` — 404 uniforme si no existe.
//   2. Ownership del evento (`Event.userId === currentUserId`) — 404 uniforme si ajeno
//      (SEC-04, EC-07, AUTH-TS-03).
//   3. Vendor target existe (`VendorProfile` por `body.vendor_profile_id`) — 404 uniforme
//      (SEC-04, EC-06).
//   4. Elegibilidad: `event.completedAt IS NOT NULL` — else 403 `event_not_completed` (EC-02).
//   5. Elegibilidad: `now <= completedAt + 30 días` — else 403 `window_expired` (EC-03).
//   6. Verificación bilateral: existe `BookingIntent.confirmed_intent` con `vendor_profile_id`
//      igual al del body Y `event_id` igual al del body (a través de `Quote.QuoteRequest`) —
//      else 403 `no_booking` (EC-01, D5). Persiste su `id` como `bookingIntentId` del review.
//   7. Unicidad: no existe review previa `(booking_intent_id)` con `deletedAt IS NULL AND
//      status IN ('published','hidden')` — else 403 `already_reviewed` (AC-03, D6).
//      Semánticamente equivalente a UNIQUE (`event_id`, `vendor_profile_id`) porque el
//      `BookingIntent.confirmed_intent` es 1:1 con ese par (`uq_booking_intents_active_per_quote`,
//      US-060). Ver DEV-01/DEV-03 del execution record US-065.
//   8. INSERT review — `status='published'`, `authorId=currentUserId`, `comment` normalizado
//      (cadena vacía o trim vacío ⇒ `null`, AC-02, D1).
//   9. Recálculo total denormalize (D4, Tech Spec §7): `rating_avg = AVG(rating)` y
//      `reviews_count = COUNT(*)` sobre reviews `status='published' AND deleted_at IS NULL`
//      del vendor, y UPDATE atómico de `VendorProfile.ratingAvg + reviewsCount`.
//  10. Fan-out atómico vía `BookingEventNotifierPort.emit({ tx })` al vendor con
//      `event='review.published'` — 2 Notifications (in_app + email_simulated) que participan
//      en la misma transacción (D5). Un fallo revierte todo (D3, atomicidad).
//  11. Log estructurado `review.published` con `{reviewId, vendorProfileId, eventId,
//      organizerUserId, rating}` — SEC-09 no expone `comment` ni PII.
//
// Errores mapeados por el `errorHandlerMiddleware`:
//   - `ReviewTargetNotFoundError → 404 RESOURCE_NOT_FOUND` (uniforme, SEC-04).
//   - `ReviewNotEligibleError → 403 REVIEW_NOT_ELIGIBLE` (`details.reason`).
import { Prisma, type PrismaClient } from '@prisma/client';
import { ReviewStatus, BookingIntentStatus } from '@prisma/client';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type { ReviewEventNotifierPort } from '../ports/review-event-notifier.port.js';
import {
  ReviewNotEligibleError,
  ReviewTargetNotFoundError,
} from '../domain/us065.errors.js';
import type { CreateReviewBody } from '../interface/create-review.dto.js';
import type { ReviewStatusLiteral, ReviewView } from '../domain/review.view.js';

/** Ventana de 30 días naturales para publicar una reseña (D3, EC-03). */
const REVIEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface CreateReviewCtx {
  correlationId?: string;
}

interface AggregateRow {
  avg: Prisma.Decimal | null;
  count: number;
}

export class CreateReviewUseCase {
  constructor(
    private readonly notifications: ReviewEventNotifierPort,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    body: CreateReviewBody,
    ctx: CreateReviewCtx = {},
  ): Promise<ReviewView> {
    const now = this.clock.now();
    const normalizedComment = normalizeComment(body.comment);

    return this.prisma.$transaction(async (tx) => {
      // 1) Event target — 404 uniforme.
      const event = await tx.event.findUnique({
        where: { id: body.event_id },
        select: { id: true, userId: true, completedAt: true },
      });
      if (!event) throw new ReviewTargetNotFoundError();

      // 2) Ownership del evento — 404 uniforme (SEC-04, D6).
      if (event.userId !== currentUserId) {
        throw new ReviewTargetNotFoundError();
      }

      // 3) Vendor target — 404 uniforme.
      const vendor = await tx.vendorProfile.findUnique({
        where: { id: body.vendor_profile_id },
        select: { id: true, userId: true },
      });
      if (!vendor) throw new ReviewTargetNotFoundError();

      // 4) Elegibilidad: event.completedAt IS NOT NULL (EC-02).
      if (!event.completedAt) {
        throw new ReviewNotEligibleError('event_not_completed');
      }

      // 5) Ventana 30 días post-completed (EC-03).
      const expiresAtMs = event.completedAt.getTime() + REVIEW_WINDOW_MS;
      if (now.getTime() > expiresAtMs) {
        throw new ReviewNotEligibleError('window_expired');
      }

      // 6) BookingIntent confirmed_intent bilateral (event, vendor) — else 403 no_booking.
      // La cadena canónica es booking_intent → quote → quote_request → event; la use case
      // filtra por `vendorProfileId` denormalizado directamente en `BookingIntent` (US-060
      // BE-003 lo persiste) + `eventId` denormalizado (idem).
      const booking = await tx.bookingIntent.findFirst({
        where: {
          eventId: body.event_id,
          vendorProfileId: body.vendor_profile_id,
          status: BookingIntentStatus.confirmed_intent,
        },
        select: { id: true },
      });
      if (!booking) {
        throw new ReviewNotEligibleError('no_booking');
      }

      // 7) Unicidad: sin review previa activa para el booking (semántica (event, vendor)).
      const existing = await tx.review.findFirst({
        where: {
          bookingIntentId: booking.id,
          deletedAt: null,
          status: { in: [ReviewStatus.published, ReviewStatus.hidden] },
        },
        select: { id: true },
      });
      if (existing) {
        throw new ReviewNotEligibleError('already_reviewed');
      }

      // 8) INSERT review.
      const review = await tx.review.create({
        data: {
          bookingIntentId: booking.id,
          vendorProfileId: body.vendor_profile_id,
          authorId: currentUserId,
          rating: body.rating,
          comment: normalizedComment,
          status: ReviewStatus.published,
        },
      });

      // 9) Recálculo total denormalize (D4). Se usa raw SQL con `ROUND(...,2)` para preservar
      // paridad exacta con `numeric(3,2)` de `vendor_profiles.rating_avg` y con el recompute del
      // seed (US-045 `recomputeVendorRatingAggregates`).
      const aggregate = await tx.$queryRaw<AggregateRow[]>(
        Prisma.sql`SELECT ROUND(AVG(rating)::numeric, 2) AS "avg",
                          COUNT(id)::int              AS "count"
                     FROM reviews
                    WHERE vendor_profile_id = ${body.vendor_profile_id}::uuid
                      AND status = 'published'
                      AND deleted_at IS NULL`,
      );
      const stats = aggregate[0] ?? { avg: null, count: 0 };

      await tx.vendorProfile.update({
        where: { id: body.vendor_profile_id },
        data: {
          ratingAvg: stats.avg ?? null,
          reviewsCount: stats.count,
        },
      });

      // 10) Fan-out atómico al vendor.
      await this.notifications.emit({
        recipientUserId: vendor.userId,
        eventName: 'review.published',
        payload: {
          review_id: review.id,
          event_id: event.id,
          vendor_profile_id: vendor.id,
          rating: review.rating,
          has_comment: review.comment !== null,
        },
        tx,
        correlationId: ctx.correlationId,
      });

      // 11) Log de dominio — Tech Spec §14: 5 campos requeridos. SEC-09: NO se emite `comment`
      // ni PII. `organizerUserId` es semánticamente `actorId` — se emiten ambos por paridad con
      // el contrato Observability y con auditores externos.
      this.logger.emit('review.published', {
        correlationId: ctx.correlationId,
        actorId: currentUserId,
        reviewId: review.id,
        vendorProfileId: vendor.id,
        eventId: event.id,
        organizerUserId: currentUserId,
        rating: review.rating,
      });

      return toReviewView(review, event.id);
    });
  }
}

function normalizeComment(input: string | undefined): string | null {
  if (input === undefined) return null;
  const trimmed = input.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toReviewView(
  r: {
    id: string;
    bookingIntentId: string;
    vendorProfileId: string;
    authorId: string;
    rating: number;
    comment: string | null;
    status: ReviewStatus;
    createdAt: Date;
    updatedAt: Date;
  },
  eventId: string,
): ReviewView {
  return {
    id: r.id,
    eventId,
    vendorProfileId: r.vendorProfileId,
    bookingIntentId: r.bookingIntentId,
    authorUserId: r.authorId,
    rating: r.rating,
    comment: r.comment ?? null,
    status: r.status as ReviewStatusLiteral,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
