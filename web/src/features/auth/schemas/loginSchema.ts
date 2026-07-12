import { z } from 'zod';

/**
 * Schema del form de login (US-003 / FE-002). Copia disciplinada de `LoginUserRequestSchema`
 * del backend: email bien formado, password no vacío (VR-01/VR-02, mensajes genéricos) y
 * `captchaToken` opcional (condicional N=3 — solo se envía cuando el backend lo exige).
 */
export const loginSchema = z.object({
  email: z.string().trim().email('validation.emailInvalid'),
  password: z.string().min(1, 'validation.passwordRequired'),
  captchaToken: z.string().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
