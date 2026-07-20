// Mapper anonimizado — Review → AnonymizedReview (US-066 / BE-001, AC-03, SEC-03).
//
// Whitelist explícita (D2): emite SÓLO `id`, `rating`, `comment`, `eventTitle`, `createdAt` y
// (condicional) `status`. NUNCA copia `authorId`, `bookingIntentId`, `vendorProfileId` ni
// campos derivados del organizer. La entrada `AnonymizedReviewRow` es intencionalmente estrecha
// para hacer imposible un leak accidental: el use case sólo `select` las columnas necesarias
// desde Prisma (BE-005 — sin N+1, con `event: { select: { title: true } }`).
import type { ReviewStatus } from '@prisma/client';
import type { AnonymizedReview } from '../interface/list-vendor-reviews.response.js';

export interface AnonymizedReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  status: ReviewStatus;
  bookingIntent: { event: { title: string } };
}

export interface AnonymizeOptions {
  /** Cuando `true`, el mapper incluye `status` en la salida (D3 admin sees-all). */
  includeStatus: boolean;
}

export function toAnonymizedReview(
  row: AnonymizedReviewRow,
  opts: AnonymizeOptions,
): AnonymizedReview {
  const base: AnonymizedReview = {
    id: row.id,
    rating: row.rating,
    comment: row.comment ?? null,
    eventTitle: row.bookingIntent.event.title,
    createdAt: row.createdAt.toISOString(),
  };
  if (opts.includeStatus) {
    base.status = row.status;
  }
  return base;
}
