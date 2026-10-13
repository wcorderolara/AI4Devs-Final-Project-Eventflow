import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '@/shared/validation/passwordPolicy';

/**
 * Schema del form de cambio de contraseña (US-006 / FE-002). Espeja la política backend
 * (>=10, al menos una letra y un número) y agrega la confirmación cliente `confirmNewPassword`.
 * Mensajes = claves i18n (namespace `profile`).
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'validation.currentPasswordRequired'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, 'validation.passwordPolicy')
      .regex(/[A-Za-z]/, 'validation.passwordPolicy')
      .regex(/[0-9]/, 'validation.passwordPolicy'),
    confirmNewPassword: z.string().min(1, 'validation.confirmRequired'),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'validation.passwordsMismatch',
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
