// Request DTO — Solicitud de reset de contraseña (US-094 / BE-001). AC-06; VR-01, VR-06.
// Respuesta siempre 202 genérica (anti-enumeración): el DTO solo valida forma de email + captcha.
import { z } from 'zod';

export const PasswordResetRequestSchema = z
  .object({
    email: z.string().email().max(254).toLowerCase(),
    captchaToken: z.string().min(1),
  })
  .strict();

export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
