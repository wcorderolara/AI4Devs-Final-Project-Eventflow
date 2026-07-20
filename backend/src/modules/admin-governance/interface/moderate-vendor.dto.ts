// Request DTOs — Moderate VendorProfile (US-047 / BE-001). Tech Spec §7 DTOs; Decisiones PO
// D1/D4/D5.
//
// Contrato del body para `POST /api/v1/admin/vendors/:id/moderate`:
//
//   {
//     "action": "approve" | "reject" | "hide" | "unhide",
//     "reason": "<string [10..500]>"      // required en reject/hide (D4)
//                                          // optional en approve/unhide (D3)
//   }
//
// - `action` enum estricto (VR-02, EC-07): otro valor ⇒ `400 INVALID_ACTION` mapeado por
//   el error handler global (Zod `enum` → VALIDATION_ERROR → traducido a INVALID_ACTION en
//   el controller via `.superRefine` no aplica: usamos el catálogo genérico y confiamos en
//   el envelope estándar `VALIDATION_ERROR` — el status HTTP es 400 en ambos casos).
// - `reason` es `string().min(10).max(500)` cuando está presente (VR-04, EC-05). El
//   cross-field refine (D4) exige que `reject` y `hide` traigan `reason` — el mensaje
//   se sobre-escribe con `REASON_REQUIRED` en el error handler para preservar el código
//   estable del contrato (Tech Spec §7 Error Handling).
// - `.strict()` (VR-05): cualquier campo adicional dispara `400 VALIDATION_ERROR` con
//   `details.unrecognized_keys[*]`. Impide expansión silenciosa del contrato.
//
// El path param `:id` (UUID validado por Zod) se valida en `ModerateVendorParamsSchema` para
// alinear el envelope `INVALID_UUID` del error handler global (VR-01, EC-06).
import { z } from 'zod';

export const MODERATE_VENDOR_REASON_MIN = 10;
export const MODERATE_VENDOR_REASON_MAX = 500;

export const MODERATE_VENDOR_ACTIONS = ['approve', 'reject', 'hide', 'unhide'] as const;
export type ModerateVendorAction = (typeof MODERATE_VENDOR_ACTIONS)[number];

// Acciones que exigen `reason` presente (D4). `approve` y `unhide` lo aceptan opcional.
const REASON_REQUIRED_ACTIONS = new Set<ModerateVendorAction>(['reject', 'hide']);

/**
 * Base schema (`ZodObject`) sin el cross-field refine — se expone a `zod-to-openapi` porque
 * el snapshot OpenAPI requiere `ZodObject` (mismo criterio que `AdminReviewsQueryBaseSchema`
 * de US-077). El shape del contrato es idéntico al del schema completo; el refine cross-field
 * es sólo validación runtime.
 */
export const ModerateVendorBodyBaseSchema = z
  .object({
    action: z.enum(MODERATE_VENDOR_ACTIONS),
    reason: z
      .string()
      .min(MODERATE_VENDOR_REASON_MIN)
      .max(MODERATE_VENDOR_REASON_MAX)
      .optional(),
  })
  .strict();

export const ModerateVendorBodySchema = ModerateVendorBodyBaseSchema.superRefine((data, ctx) => {
  // Cross-field refine — Decisión PO D4. `reject` y `hide` sin reason ⇒ REASON_REQUIRED.
  // Se emite en el path `reason` para que el envelope Zod ubique el error en el campo
  // adecuado; el `code: 'custom'` + mensaje `REASON_REQUIRED` viaja al cliente como
  // `details = [{field: 'reason', message: 'REASON_REQUIRED'}]` bajo `VALIDATION_ERROR`.
  if (REASON_REQUIRED_ACTIONS.has(data.action) && !data.reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: 'REASON_REQUIRED',
    });
  }
});

export type ModerateVendorBody = z.infer<typeof ModerateVendorBodySchema>;

export const ModerateVendorParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ModerateVendorParams = z.infer<typeof ModerateVendorParamsSchema>;
