// Response DTO — Listar reviews de vendor (US-066 / BE-001). Tech Spec §9 Response 200.
//
// Contrato camelCase (BR-API-004). El mapper `toAnonymizedReviewResponse` aplica whitelist
// explícita (D2): sólo emite `id`, `rating`, `comment`, `eventTitle`, `createdAt`, y
// (condicional) `status`. NO expone `authorId`, `bookingIntentId`, `vendorProfileId`, ni
// nombre del organizer — SEC-03/AC-03.
//
// `status` sólo aparece en la respuesta cuando el requester es admin (D3): para no-admin
// todos los items son `published` por filtro del use case, por lo que el campo se omite y
// no leakea la existencia de otros estados.
import { z } from 'zod';

export const AnonymizedReviewSchema = z
  .object({
    id: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().nullable(),
    eventTitle: z.string(),
    createdAt: z.string().datetime(),
    status: z.enum(['published', 'hidden', 'removed']).optional(),
  })
  .strict();

export const VendorSummarySchema = z
  .object({
    id: z.string().uuid(),
    businessName: z.string(),
    slug: z.string(),
    status: z.string(),
    ratingAvg: z.number().nullable(),
    reviewsCount: z.number().int().min(0),
  })
  .strict();

export const PaginationSchema = z
  .object({
    nextCursor: z.string().nullable(),
    pageSize: z.number().int().min(1),
  })
  .strict();

export const ListVendorReviewsResponseSchema = z
  .object({
    vendor: VendorSummarySchema,
    items: z.array(AnonymizedReviewSchema),
    pagination: PaginationSchema,
  })
  .strict();

export type AnonymizedReview = z.infer<typeof AnonymizedReviewSchema>;
export type VendorSummary = z.infer<typeof VendorSummarySchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type ListVendorReviewsResponse = z.infer<typeof ListVendorReviewsResponseSchema>;
