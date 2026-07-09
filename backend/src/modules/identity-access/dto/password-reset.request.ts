// Request DTO — Aplicar reset de contraseña con token (US-094 / BE-001). AC-07; VR-02, VR-07.
import { z } from 'zod';
import { passwordSchema } from '../../../shared/validation/password.js';

export const PasswordResetSchema = z
  .object({
    token: z.string().min(1),
    newPassword: passwordSchema,
  })
  .strict();

export type PasswordResetDto = z.infer<typeof PasswordResetSchema>;
