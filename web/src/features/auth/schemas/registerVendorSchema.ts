import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from './registerOrganizerSchema';

/**
 * Schema del form de registro de proveedor (US-002 / FE-002). Copia disciplinada de la variant
 * vendor del DTO backend (`RegisterVendorRequestSchema`). Mensajes = claves i18n de
 * `auth.register` (validation.*).
 */
export const registerVendorSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(2, 'validation.businessNameLength')
      .max(150, 'validation.businessNameLength'),
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

export type RegisterVendorFormValues = z.infer<typeof registerVendorSchema>;
