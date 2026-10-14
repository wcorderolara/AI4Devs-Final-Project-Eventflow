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
import { uuidParamsSchema } from '../../../shared/validation/uuid-params.js';
import {
  CATALOG_DESCRIPTION_I18N_SCHEMA,
  CATALOG_NAME_I18N_SCHEMA,
  CATALOG_REASON_SCHEMA,
  CATALOG_SORT_ORDER_SCHEMA,
  CatalogDeleteBodySchema,
} from '../../../shared/validation/catalog-admin.schemas.js';

// ─────────────────────────────────────────────────────────────────────────────
// Fragmentos reutilizables
// ─────────────────────────────────────────────────────────────────────────────

/** `code` slug estable (VR-02). */
const CODE_SCHEMA = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);

// ─────────────────────────────────────────────────────────────────────────────
// Path params
// ─────────────────────────────────────────────────────────────────────────────

export const ServiceCategoryIdParamsSchema = uuidParamsSchema('id');
export type ServiceCategoryIdParams = z.infer<typeof ServiceCategoryIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Create body (BE-001) — POST /admin/service-categories
// ─────────────────────────────────────────────────────────────────────────────

export const CreateServiceCategoryBodySchema = z
  .object({
    code: CODE_SCHEMA,
    name_i18n: CATALOG_NAME_I18N_SCHEMA,
    description_i18n: CATALOG_DESCRIPTION_I18N_SCHEMA.optional(),
    parent_id: z.string().uuid().nullable().optional(),
    sort_order: CATALOG_SORT_ORDER_SCHEMA.optional().default(0),
    reason: CATALOG_REASON_SCHEMA,
  })
  .strict();
export type CreateServiceCategoryBody = z.infer<typeof CreateServiceCategoryBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Update body (BE-002) — PATCH /admin/service-categories/:id
// ─────────────────────────────────────────────────────────────────────────────

export const UpdateServiceCategoryBodySchema = z
  .object({
    name_i18n: CATALOG_NAME_I18N_SCHEMA.optional(),
    description_i18n: CATALOG_DESCRIPTION_I18N_SCHEMA.optional(),
    parent_id: z.string().uuid().nullable().optional(),
    sort_order: CATALOG_SORT_ORDER_SCHEMA.optional(),
    is_active: z.boolean().optional(),
    reason: CATALOG_REASON_SCHEMA,
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

export const DeleteServiceCategoryBodySchema = CatalogDeleteBodySchema;
export type DeleteServiceCategoryBody = z.infer<typeof DeleteServiceCategoryBodySchema>;
