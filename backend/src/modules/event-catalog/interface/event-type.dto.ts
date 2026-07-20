// DTOs Zod strict del CRUD admin de `EventType` (US-076 / BE-001..003).
// Tech Spec §7 DTOs; Decisiones PO D3/D5/D6/D7. Paridad EXACTA con US-075 sin jerarquía.
//
// Contrato: los DTOs cubren SHAPE + TIPOS + rangos numéricos. Las invariantes de
// negocio con códigos de error estables (INVALID_NAME_I18N cuando falta `es-LATAM`,
// REASON_REQUIRED vs INVALID_REASON_LENGTH) las verifican los UseCases o el controller
// y disparan errores de dominio con `code` del catálogo. `validateRequestMiddleware`
// produce `ValidationError` genérica cuando Zod falla.
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

/**
 * `code` slug estable (VR-02). Acepta letras, dígitos, guiones y underscores para
 * cubrir los 6 obligatorios (`baby_shower` usa underscore).
 */
const CODE_SCHEMA = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_-]+$/);

/** `sort_order` >= 0 integer (VR-04). */
const SORT_ORDER_SCHEMA = z.number().int().nonnegative();

// ─────────────────────────────────────────────────────────────────────────────
// Path params
// ─────────────────────────────────────────────────────────────────────────────

export const EventTypeIdParamsSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();
export type EventTypeIdParams = z.infer<typeof EventTypeIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Create body (BE-001) — POST /admin/event-types
// ─────────────────────────────────────────────────────────────────────────────

export const CreateEventTypeBodySchema = z
  .object({
    code: CODE_SCHEMA,
    name_i18n: NAME_I18N_SHAPE,
    description_i18n: DESCRIPTION_I18N_SHAPE.optional(),
    sort_order: SORT_ORDER_SCHEMA.optional().default(0),
    reason: z.string().max(500).optional(),
  })
  .strict();
export type CreateEventTypeBody = z.infer<typeof CreateEventTypeBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Update body (BE-002) — PATCH /admin/event-types/:id
// ─────────────────────────────────────────────────────────────────────────────

export const UpdateEventTypeBodySchema = z
  .object({
    name_i18n: NAME_I18N_SHAPE.optional(),
    description_i18n: DESCRIPTION_I18N_SHAPE.optional(),
    sort_order: SORT_ORDER_SCHEMA.optional(),
    is_active: z.boolean().optional(),
    reason: z.string().max(500).optional(),
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

/**
 * `reason` recibido como string opcional para que el controller distinga
 * `REASON_REQUIRED` (ausente / vacío) de `INVALID_REASON_LENGTH` (fuera de
 * [10..500]) y emita códigos estables.
 */
export const DeleteEventTypeBodySchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict();
export type DeleteEventTypeBody = z.infer<typeof DeleteEventTypeBodySchema>;
