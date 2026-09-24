// DTOs (Zod) del flujo OAuth Google (US-008 / API-001). Validación estricta de los endpoints de
// continuación. El rol de signup se restringe a `organizer`/`vendor` (VR-03, NT-04): `admin` NUNCA
// es aceptable (el enum lo excluye → VALIDATION_ERROR). La query del callback se valida de forma
// tolerante (el controller decide cancelación vs error) para poder responder con redirect neutro.
import { z } from 'zod';

/** Query del callback de Google. `code`+`state` en el happy path; `error` en cancelación (EC-02). */
export const GoogleCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  error_description: z.string().optional(),
});
export type GoogleCallbackQuery = z.infer<typeof GoogleCallbackQuerySchema>;

/** Body de completar signup: rol obligatorio (VR-03), solo `organizer`/`vendor`. */
export const CompleteGoogleSignupSchema = z
  .object({
    role: z.enum(['organizer', 'vendor']),
  })
  .strict();
export type CompleteGoogleSignupBody = z.infer<typeof CompleteGoogleSignupSchema>;

/** Body de confirmar vinculación: confirmación explícita obligatoria (AC-03). */
export const ConfirmGoogleLinkSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict();
export type ConfirmGoogleLinkBody = z.infer<typeof ConfirmGoogleLinkSchema>;
