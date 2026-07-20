// Request DTO — Admin reviews list query (US-077 / BE-001). Tech Spec §7.
//
// Query params del endpoint `GET /api/v1/admin/reviews` (Decisiones PO D2/D3/D6/D8):
//
//   `status`             string | string[]  — multi-status (`?status=published&status=hidden`), Decisión PO D8.
//   `vendor_id`          UUID?             — filtro por vendor.
//   `created_at_from`    ISO date-time?    — límite inferior de rango de fechas.
//   `created_at_to`      ISO date-time?    — límite superior de rango de fechas.
//   `rating_min`         int 1..5?         — filtro por rating mínimo.
//   `rating_max`         int 1..5?         — filtro por rating máximo.
//   `has_admin_action`   boolean?          — true = sólo moderadas; false = sólo NO moderadas.
//   `pageSize`           int 1..50, default 25 — VR-01.
//   `cursor`             base64url?        — cursor opaco keyset paridad US-066 (D3).
//
// Refines cross-field (Decisión PO D2 + EC-04): `rating_min <= rating_max` y
// `created_at_from <= created_at_to`. Fuera de rango ⇒ `400 INVALID_FILTERS` con `details.field`
// via el path Zod del refine.
//
// `.strict()` (VR-04 heredado del catálogo admin) rechaza claves adicionales para evitar
// expansión silenciosa del contrato.
//
// La normalización de `status` a array se aplica en el propio schema para simplificar el UseCase
// (siempre recibe `string[] | undefined`), soportando el patrón GET repeat (`?status=a&status=b`
// que Express expone como array) y el string simple (`?status=a` como string).
import { z } from 'zod';

/** Valores permitidos del enum `ReviewStatus` (Prisma). Se acepta también `deleted` por paridad
 *  histórica de la tabla — actualmente sin fila con ese valor (US-065/US-067 no lo emiten), pero
 *  el filtro admin lo permite para no bloquear consultas exploratorias. */
export const AdminReviewStatusEnum = z.enum(['published', 'hidden', 'removed']);
export type AdminReviewStatus = z.infer<typeof AdminReviewStatusEnum>;

const StatusInput = z
  .union([AdminReviewStatusEnum, z.array(AdminReviewStatusEnum)])
  .transform((v): AdminReviewStatus[] => (Array.isArray(v) ? v : [v]));

/** Rango 1..50 (Decisión PO D2). `default(25)` cuando el query omite el parámetro. */
const PageSizeSchema = z.coerce.number().int().min(1).max(50).default(25);

const RatingSchema = z.coerce.number().int().min(1).max(5);

const DateSchema = z.coerce.date();

const BooleanSchema = z
  .union([z.enum(['true', 'false']), z.boolean()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true'));

/**
 * Schema base (ZodObject) — expuesto sin refines para poder ser consumido por
 * `zod-to-openapi` que espera un `ZodObject` en `op({ query })`. Los refines cross-field se
 * aplican en el schema completo (`AdminReviewsQuerySchema`).
 */
export const AdminReviewsQueryBaseSchema = z
  .object({
    status: StatusInput.optional(),
    vendor_id: z.string().uuid().optional(),
    created_at_from: DateSchema.optional(),
    created_at_to: DateSchema.optional(),
    rating_min: RatingSchema.optional(),
    rating_max: RatingSchema.optional(),
    has_admin_action: BooleanSchema.optional(),
    pageSize: PageSizeSchema,
    cursor: z.string().min(1).max(512).optional(),
  })
  .strict();

export const AdminReviewsQuerySchema = AdminReviewsQueryBaseSchema.superRefine((d, ctx) => {
    if (
      d.rating_min !== undefined &&
      d.rating_max !== undefined &&
      d.rating_min > d.rating_max
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rating_min'],
        message: 'rating_min must be <= rating_max',
      });
    }
    if (
      d.created_at_from !== undefined &&
      d.created_at_to !== undefined &&
      d.created_at_from.getTime() > d.created_at_to.getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['created_at_from'],
        message: 'created_at_from must be <= created_at_to',
      });
    }
  });

export type AdminReviewsQuery = z.infer<typeof AdminReviewsQuerySchema>;
