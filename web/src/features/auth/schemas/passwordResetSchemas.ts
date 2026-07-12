import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from './registerOrganizerSchema';

/**
 * Schemas del flujo de recuperación (US-004 / FE-001, FE-002). Copias disciplinadas de
 * `PasswordResetRequestSchema` y `PasswordResetSchema` del backend. Mensajes = claves i18n.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('validation.emailInvalid'),
  captchaToken: z.string().min(1, 'validation.captchaRequired'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH, 'validation.passwordPolicy')
    .max(256, 'validation.passwordPolicy')
    .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), 'validation.passwordPolicy'),
});

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
