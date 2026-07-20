// Response DTO — Review verificada (US-065 / BE-001). Tech Spec §9 Response 201.
//
// Contrato camelCase (BR-API-004) para el `success` envelope. Se serializa con `.strict()`
// para preservar la disciplina anti-drift de contratos.
import { z } from 'zod';
import type { ReviewView } from '../domain/review.view.js';

export const ReviewResponseSchema = z
  .object({
    id: z.string().uuid(),
    eventId: z.string().uuid(),
    vendorProfileId: z.string().uuid(),
    bookingIntentId: z.string().uuid(),
    authorUserId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().nullable(),
    status: z.enum(['published', 'hidden', 'removed']),
    createdAt: z.string().datetime(),
  })
  .strict();

export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

export function toReviewResponse(view: ReviewView): ReviewResponse {
  return {
    id: view.id,
    eventId: view.eventId,
    vendorProfileId: view.vendorProfileId,
    bookingIntentId: view.bookingIntentId,
    authorUserId: view.authorUserId,
    rating: view.rating,
    comment: view.comment,
    status: view.status,
    createdAt: view.createdAt,
  };
}
