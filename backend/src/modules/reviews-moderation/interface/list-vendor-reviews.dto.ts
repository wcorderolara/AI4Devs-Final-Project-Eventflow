// Request DTOs — Listar reviews de un vendor (US-066 / BE-001). Tech Spec §7 DTOs.
//
// Path param: `id` UUID del vendor. Query: `cursor` (opaco base64url) + `pageSize` (1..50,
// default 20). `.strict()` (VR-04 / paridad con US-045) rechaza cualquier atributo desconocido.
//
// Los errores específicos (`INVALID_UUID`, `INVALID_PAGE_SIZE`, `INVALID_CURSOR`) se elevan
// desde el controller/use case en lugar de dejar caer al `VALIDATION_ERROR` genérico, para
// exponer códigos accionables al cliente (paridad con `error-codes.ts §US-045..US-046`).
import { z } from 'zod';

const PAGE_SIZE_MIN = 1;
const PAGE_SIZE_MAX = 50;
const PAGE_SIZE_DEFAULT = 20;
const CURSOR_MAX_LEN = 512;

export const VendorIdParamSchema = z
  .object({
    id: z.string().uuid('id must be a valid UUID'),
  })
  .strict();

export const ListVendorReviewsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(CURSOR_MAX_LEN).optional(),
    pageSize: z.coerce
      .number({ invalid_type_error: 'pageSize must be an integer' })
      .int('pageSize must be an integer')
      .min(PAGE_SIZE_MIN, `pageSize must be >= ${PAGE_SIZE_MIN}`)
      .max(PAGE_SIZE_MAX, `pageSize must be <= ${PAGE_SIZE_MAX}`)
      .default(PAGE_SIZE_DEFAULT),
  })
  .strict();

export type VendorIdParam = z.infer<typeof VendorIdParamSchema>;
export type ListVendorReviewsQuery = z.infer<typeof ListVendorReviewsQuerySchema>;

export const VENDOR_REVIEWS_PAGE_SIZE = {
  MIN: PAGE_SIZE_MIN,
  MAX: PAGE_SIZE_MAX,
  DEFAULT: PAGE_SIZE_DEFAULT,
} as const;
