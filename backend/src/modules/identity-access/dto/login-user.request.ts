// Request DTO — Login de usuario (US-092 / BE-003). AC-03; VR-01, VR-05.
import { z } from 'zod';

export const LoginUserRequestSchema = z
  .object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1),
    captchaToken: z.string().min(1),
  })
  .strict();

export type LoginUserRequest = z.infer<typeof LoginUserRequestSchema>;
