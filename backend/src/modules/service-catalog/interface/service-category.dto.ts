// DTOs Zod strict del CRUD admin de `ServiceCategory` (US-075 / BE-001..003).
// Tech Spec §7 DTOs; Decisiones PO D3/D5/D7/D8.
//
// Contrato: los DTOs cubren SHAPE + TIPOS + rangos numéricos. Las invariantes de
// negocio con códigos de error estables (INVALID_NAME_I18N cuando falta `es-LATAM`,
// REASON_REQUIRED vs INVALID_REASON_LENGTH, INVALID_PARENT_ID cuando el UUID no
// existe en BD) las verifican los UseCases o el controller y disparan errores de
// dominio con `code` del catálogo. `validateRequestMiddleware` produce
// `ValidationError` genérica cuando Zod falla — sin acoplar el shared middleware a
// mapeos por campo.
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Fragmentos reutilizables
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `name_i18n` como record<locale, string> no vacío. La invariante "es-LATAM
 * requerido" (Decisión PO D3 + VR-03) se valida en el UseCase con
 * `InvalidNameI18nError` para emitir el código estable `INVALID_NAME_I18N`.
 */
const NAME_I18N_SHAPE = z.record(z.string().min(1).max(200));

/** `description_i18n` opcional (Decisión PO D3). */
const DESCRIPTION_I18N_SHAPE = z.record(z.string().max(2000));

/** `code` slug estable (VR-02). */
const CODE_SCHEMA = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);

/** `sort_order` >= 0 integer (VR-07). */
const SORT_ORDER_SCHEMA = z.number().int().nonnegative();

// ─────────────────────────────────────────────────────────────────────────────
// Path params
// ─────────────────────────────────────────────────────────────────────────────

export const ServiceCategoryIdParamsSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();
export type ServiceCategoryIdParams = z.infer<typeof ServiceCategoryIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Create body (BE-001) — POST /admin/service-categories
// ─────────────────────────────────────────────────────────────────────────────

export const CreateServiceCategoryBodySchema = z
  .object({
    code: CODE_SCHEMA,
    name_i18n: NAME_I18N_SHAPE,
    description_i18n: DESCRIPTION_I18N_SHAPE.optional(),
    parent_id: z.string().uuid().nullable().optional(),
    sort_order: SORT_ORDER_SCHEMA.optional().default(0),
    reason: z.string().max(500).optional(),
  })
  .strict();
export type CreateServiceCategoryBody = z.infer<typeof CreateServiceCategoryBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Update body (BE-002) — PATCH /admin/service-categories/:id
// ─────────────────────────────────────────────────────────────────────────────

export const UpdateServiceCategoryBodySchema = z
  .object({
    name_i18n: NAME_I18N_SHAPE.optional(),
    description_i18n: DESCRIPTION_I18N_SHAPE.optional(),
    parent_id: z.string().uuid().nullable().optional(),
    sort_order: SORT_ORDER_SCHEMA.optional(),
    is_active: z.boolean().optional(),
    reason: z.string().max(500).optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.name_i18n !== undefined ||
      v.description_i18n !== undefined ||
      v.parent_id !== undefined ||
      v.sort_order !== undefined ||
      v.is_active !== undefined,
    { message: 'At least one field must be provided', path: [] },
  );
export type UpdateServiceCategoryBody = z.infer<typeof UpdateServiceCategoryBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Soft delete body (BE-003) — DELETE /admin/service-categories/:id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `reason` recibido como unknown para que el controller distinga `REASON_REQUIRED`
 * (ausente / vacío) de `INVALID_REASON_LENGTH` (fuera de [10..500]) y emita códigos
 * estables. Zod solo garantiza que el body es un objeto con la única clave `reason`.
 */
export const DeleteServiceCategoryBodySchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict();
export type DeleteServiceCategoryBody = z.infer<typeof DeleteServiceCategoryBodySchema>;
