// DTOs Zod strict del CRUD admin de `EventType` (US-076 / BE-001..003).
// Tech Spec §7 DTOs; Decisiones PO D3/D5/D6/D7. Paridad EXACTA con US-075 sin jerarquía.
//
// Contrato: los DTOs cubren SHAPE + TIPOS + rangos numéricos. Las invariantes de
// negocio con códigos de error estables (INVALID_NAME_I18N cuando falta `es-LATAM`,
// REASON_REQUIRED vs INVALID_REASON_LENGTH) las verifican los UseCases o el controller
// y disparan errores de dominio con `code` del catálogo. `validateRequestMiddleware`
// produce `ValidationError` genérica cuando Zod falla.
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

/**
 * `code` slug estable (VR-02). Acepta letras, dígitos, guiones y underscores para
 * cubrir los 6 obligatorios (`baby_shower` usa underscore).
 */
const CODE_SCHEMA = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_-]+$/);

// ─────────────────────────────────────────────────────────────────────────────
// Path params
// ─────────────────────────────────────────────────────────────────────────────

export const EventTypeIdParamsSchema = uuidParamsSchema('id');
export type EventTypeIdParams = z.infer<typeof EventTypeIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Create body (BE-001) — POST /admin/event-types
// ─────────────────────────────────────────────────────────────────────────────

export const CreateEventTypeBodySchema = z
  .object({
    code: CODE_SCHEMA,
    name_i18n: CATALOG_NAME_I18N_SCHEMA,
    description_i18n: CATALOG_DESCRIPTION_I18N_SCHEMA.optional(),
    sort_order: CATALOG_SORT_ORDER_SCHEMA.optional().default(0),
    reason: CATALOG_REASON_SCHEMA,
  })
  .strict();
export type CreateEventTypeBody = z.infer<typeof CreateEventTypeBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Update body (BE-002) — PATCH /admin/event-types/:id
// ─────────────────────────────────────────────────────────────────────────────

export const UpdateEventTypeBodySchema = z
  .object({
    name_i18n: CATALOG_NAME_I18N_SCHEMA.optional(),
    description_i18n: CATALOG_DESCRIPTION_I18N_SCHEMA.optional(),
    sort_order: CATALOG_SORT_ORDER_SCHEMA.optional(),
    is_active: z.boolean().optional(),
    reason: CATALOG_REASON_SCHEMA,
  })
  .strict()
  .refine(
    (v) =>
      v.name_i18n !== undefined ||
      v.description_i18n !== undefined ||
      v.sort_order !== undefined ||
      v.is_active !== undefined,
    { message: 'At least one field must be provided', path: [] },
  );
export type UpdateEventTypeBody = z.infer<typeof UpdateEventTypeBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Soft delete body (BE-003) — DELETE /admin/event-types/:id
// ─────────────────────────────────────────────────────────────────────────────

export const DeleteEventTypeBodySchema = CatalogDeleteBodySchema;
export type DeleteEventTypeBody = z.infer<typeof DeleteEventTypeBodySchema>;
