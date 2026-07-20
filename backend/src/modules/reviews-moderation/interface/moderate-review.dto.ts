// Request DTO — Moderate Review (US-067 / BE-001). Tech Spec §7 DTOs; Decisión PO D9.
//
// Contrato del body para `POST /api/v1/admin/reviews/:id/moderate`:
//
//   {
//     "action": "hide" | "remove",
//     "reason": "<string [10..500]>"
//   }
//
// - `action` enum estricto (VR-02, EC-05): sólo `hide` o `remove`; otro valor ⇒ `400 VALIDATION_ERROR`.
// - `reason` string [10..500] (VR-03, EC-03; Decisión PO D5): garantiza audit trail informativo
//   (SEC-06). El upper bound protege contra AdminAction gigantes en la BD (BR-ADMIN-011).
// - `.strict()` (VR-04, D9): cualquier campo adicional dispara `400 VALIDATION_ERROR` con
//   `details.unrecognized_keys[*]`. Impide expansión silenciosa del contrato.
//
// El path param `:id` (UUID validado por Zod) se valida en `moderateReviewParamsSchema` para
// mantener alineado el envelope `INVALID_UUID` del error handler global (VR-01, EC-04).
import { z } from 'zod';

export const MODERATE_REVIEW_REASON_MIN = 10;
export const MODERATE_REVIEW_REASON_MAX = 500;

export const ModerateReviewBodySchema = z
  .object({
    action: z.enum(['hide', 'remove']),
    reason: z.string().min(MODERATE_REVIEW_REASON_MIN).max(MODERATE_REVIEW_REASON_MAX),
  })
  .strict();

export type ModerateReviewBody = z.infer<typeof ModerateReviewBodySchema>;

export const ModerateReviewParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ModerateReviewParams = z.infer<typeof ModerateReviewParamsSchema>;
