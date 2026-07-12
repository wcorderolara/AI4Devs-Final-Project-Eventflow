// Request DTO — Login de usuario (US-092 / BE-003; US-003 / BE-001). VR-01/VR-02: email bien
// formado y password no vacío (mensajes genéricos, sin pistas). `captchaToken` es OPCIONAL:
// el captcha de login es CONDICIONAL (N=3 fallos consecutivos por IP+email — Decisión PO
// US-003 #1/#2); antes del umbral el token se ignora, tras el umbral lo exige el middleware.
import { z } from 'zod';

export const LoginUserRequestSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(1),
    captchaToken: z.string().min(1).optional(),
  })
  .strict();

export type LoginUserRequest = z.infer<typeof LoginUserRequestSchema>;
