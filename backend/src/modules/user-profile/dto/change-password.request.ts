// Request DTO — Cambiar contraseña autenticado (US-094 / BE-001). AC (change-password); VR-02.
// Requiere la contraseña actual (verificación en el use case) + la nueva conforme a política.
import { z } from 'zod';
import { passwordSchema } from '../../../shared/validation/password.js';

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .strict();

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
