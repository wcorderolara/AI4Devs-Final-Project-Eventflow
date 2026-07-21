// US-080 / BE-001 — Request DTO del listado admin del audit log AdminAction.
// Tech Spec §7 · Decisiones PO D2/D3/D8. Filtros estructurados sin búsqueda libre.
//
// Query params del endpoint `GET /api/v1/admin/admin-actions`:
//
//   `admin_id`          UUID?                 — filtra por AdminAction.adminUserId (VR-03).
//   `target_type`       string?               — enum tech-spec (D2). Se mapea a `target_entity`.
//   `target_id`         UUID?                 — target puntual (VR-04).
//   `action`            string [1..64]?       — nombre exacto de la acción (paridad seed/moderation).
//   `created_at_from`   ISO date/date-time?   — límite inferior de rango.
//   `created_at_to`     ISO date/date-time?   — límite superior de rango.
//   `pageSize`          int 1..50, default 25 — VR-01.
//   `cursor`            base64url?            — cursor opaco keyset (VR-02).
//
// Refines: `created_at_from <= created_at_to` (VR-05) ⇒ `400 VALIDATION_ERROR`.
// `.strict()` (paridad US-074/US-078) rechaza claves adicionales para evitar drift silencioso.
//
// Nota (DEV-1 del execution record US-080): el schema Prisma nombra la columna `target_entity`
// (no `target_type`). El DTO preserva el nombre del spec (`target_type`) porque es contrato
// público REST; el UseCase hace el mapping a `targetEntity` al componer el WHERE Prisma.
import { z } from 'zod';

/** Enum canónico de `target_type` (Decisión PO D2). */
export const AdminActionTargetTypeEnum = z.enum([
  'review',
  'vendor_profile',
  'service_category',
  'event_type',
  'event',
]);
export type AdminActionTargetType = z.infer<typeof AdminActionTargetTypeEnum>;

const PageSizeSchema = z.coerce.number().int().min(1).max(50).default(25);
const DateSchema = z.coerce.date();

/** Base ZodObject (sin refines) — consumible por `zod-to-openapi` en `openapi.ts`. */
export const AdminActionsQueryBaseSchema = z
  .object({
    admin_id: z.string().uuid().optional(),
    target_type: AdminActionTargetTypeEnum.optional(),
    target_id: z.string().uuid().optional(),
    action: z.string().min(1).max(64).optional(),
    created_at_from: DateSchema.optional(),
    created_at_to: DateSchema.optional(),
    pageSize: PageSizeSchema,
    cursor: z.string().min(1).max(512).optional(),
  })
  .strict();

export const AdminActionsQuerySchema = AdminActionsQueryBaseSchema.superRefine((d, ctx) => {
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

export type AdminActionsQuery = z.infer<typeof AdminActionsQuerySchema>;
