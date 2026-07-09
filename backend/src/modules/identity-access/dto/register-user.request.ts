// Request DTO — Registro de usuario (US-092 / BE-003). AC-03; VR-01, VR-05.
// Schema del body; se envuelve como `z.object({ body })` al montar la ruta (ver *.routes.ts).
import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';

export const RegisterUserRequestSchema = z
  .object({
    email: z.string().email().max(254).toLowerCase(),
    password: z
      .string()
      .min(10)
      .refine((v) => /[A-Z]/.test(v) && /[0-9]/.test(v), {
        message: 'La contraseña debe incluir al menos una mayúscula y un dígito',
      }),
    name: z.string().min(1).max(80).trim(),
    // Admin no se registra por API (SEC-T-01): el enum lo excluye deliberadamente.
    role: z.enum(['organizer', 'vendor']),
    language: z.enum(SUPPORTED_LANGUAGES).optional(),
    captchaToken: z.string().min(1),
  })
  .strict();

export type RegisterUserRequest = z.infer<typeof RegisterUserRequestSchema>;
