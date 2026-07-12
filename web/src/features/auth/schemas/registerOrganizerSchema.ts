import { z } from 'zod';

/**
 * Schema del form de registro de organizador (US-001 / FE-002). Copia disciplinada del DTO
 * canónico del backend `RegisterUserRequestSchema` (Doc 19 §11.2; VR-01..VR-06) — conventions
 * §6.2: sin paquete compartido en MVP; el backend sigue siendo el source of truth.
 * Los mensajes son CLAVES i18n del namespace `auth.register` (Doc 15 §26).
 */
export const PASSWORD_MIN_LENGTH = 10;

export const registerOrganizerSchema = z
  .object({
    name: z.string().trim().min(2, 'validation.nameLength').max(120, 'validation.nameLength'),
    email: z.string().email('validation.emailInvalid').max(254, 'validation.emailInvalid'),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, 'validation.passwordPolicy')
      .max(256, 'validation.passwordPolicy')
      .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), 'validation.passwordPolicy'),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: 'validation.termsRequired' }),
    }),
    captchaToken: z.string().min(1, 'validation.captchaRequired'),
  })
  // VR-02 cross-field: contraseña ≠ localpart del email (case-insensitive).
  .superRefine((data, ctx) => {
    const localpart = data.email.split('@')[0] ?? '';
    if (localpart.length > 0 && data.password.toLowerCase() === localpart.toLowerCase()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'validation.passwordLocalpart',
      });
    }
  });

export type RegisterOrganizerFormValues = z.infer<typeof registerOrganizerSchema>;
