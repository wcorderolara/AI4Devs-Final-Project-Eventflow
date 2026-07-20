// Request DTO — Admin vendors list query (US-074 / BE-001). Tech Spec §7 · Decisiones PO D1/D2.
//
// Query params del endpoint `GET /api/v1/admin/vendors`:
//
//   `status`          string | string[]  — multi-status (`?status=pending&status=approved`).
//   `is_hidden`       boolean?          — filtro por visibilidad ortogonal (US-047 D2).
//   `created_at_from` ISO date-time?    — límite inferior de rango de fechas.
//   `created_at_to`   ISO date-time?    — límite superior de rango de fechas.
//   `business_name`   string [1..100]?  — substring ILIKE case-insensitive (Decisión PO D7).
//   `pageSize`        int 1..50, default 25 — VR-01.
//   `cursor`          base64url?        — cursor opaco keyset (Decisión PO D3 · paridad US-077).
//
// Refines cross-field (Decisión PO D2 + EC-04): `created_at_from <= created_at_to`. Fuera de
// rango ⇒ `400 VALIDATION_ERROR` con `details = [{field: 'created_at_from', message: '...'}]`.
//
// `.strict()` (VR-04) rechaza claves adicionales para evitar expansión silenciosa del contrato.
//
// La normalización de `status` a array se aplica en el propio schema para simplificar el UseCase
// (siempre recibe `string[] | undefined`), soportando el patrón GET repeat (`?status=a&status=b`
// que Express expone como array) y el string simple.
//
// EC-05: `business_name` vacío/whitespace se trima a `undefined` (sin filtro) — pattern:
// aplicar `trim` sólo cuando llega el string, y usar `.optional()` para permitir la ausencia.
import { z } from 'zod';

/** Enum admin permitido — los 4 valores del enum Prisma `VendorProfileStatus`. `hidden` legacy
 * está incluido por retrocompat con vendors sembrados pre-US-047 (isHidden aún no era el flag
 * ortogonal); el UseCase mapea 1:1 al enum sin transformaciones. */
export const AdminVendorStatusEnum = z.enum(['pending', 'approved', 'rejected', 'hidden']);
export type AdminVendorStatus = z.infer<typeof AdminVendorStatusEnum>;

const StatusInput = z
  .union([AdminVendorStatusEnum, z.array(AdminVendorStatusEnum)])
  .transform((v): AdminVendorStatus[] => (Array.isArray(v) ? v : [v]));

/** Rango 1..50 (Decisión PO D2). `default(25)` cuando el query omite el parámetro. */
const PageSizeSchema = z.coerce.number().int().min(1).max(50).default(25);

const DateSchema = z.coerce.date();

const BooleanSchema = z
  .union([z.enum(['true', 'false']), z.boolean()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true'));

/**
 * `business_name` acepta cualquier string; se trima y colapsa a `undefined` si queda vacío
 * (EC-05). El length efectivo post-trim se valida en el refine cross-field más abajo para no
 * quedar atrapado en el orden de operaciones de Zod `.min()` sobre el string sin trim.
 */
const BusinessNameSchema = z
  .string()
  .max(200) // límite defensivo pre-trim
  .transform((v) => v.trim())
  .transform((v) => (v.length === 0 ? undefined : v))
  .optional();

/**
 * Schema base (ZodObject) — expuesto sin refines para poder ser consumido por
 * `zod-to-openapi` que espera un `ZodObject` en `op({ query })`. Los refines cross-field se
 * aplican en el schema completo (`AdminVendorsQuerySchema`).
 */
export const AdminVendorsQueryBaseSchema = z
  .object({
    status: StatusInput.optional(),
    is_hidden: BooleanSchema.optional(),
    created_at_from: DateSchema.optional(),
    created_at_to: DateSchema.optional(),
    business_name: BusinessNameSchema,
    pageSize: PageSizeSchema,
    cursor: z.string().min(1).max(512).optional(),
  })
  .strict();

export const AdminVendorsQuerySchema = AdminVendorsQueryBaseSchema.superRefine((d, ctx) => {
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
  if (d.business_name !== undefined && d.business_name.length > 100) {
    // VR-06: length [1..100] post-trim. El transform ya colapsó vacíos a undefined; aquí sólo
    // verificamos el upper bound para preservar el contrato explícito de la User Story.
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['business_name'],
      message: 'business_name must be at most 100 characters',
    });
  }
});

export type AdminVendorsQuery = z.infer<typeof AdminVendorsQuerySchema>;
