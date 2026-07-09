// Request DTO — Registro de usuario público (US-094 / BE-001; base US-092). AC-01, EC-01/EC-02;
// VR-01..VR-06. Schema estricto del body; se envuelve como `z.object({ body })` al montar la ruta.
// Registro público SOLO crea `organizer|vendor` (SEC-08): el enum excluye `admin` deliberadamente.
import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';
import { passwordSchema } from '../../../shared/validation/password.js';

export const RegisterUserRequestSchema = z
  .object({
    email: z.string().email().max(254).toLowerCase(),
    password: passwordSchema,
    name: z.string().min(1).max(80).trim(),
    phone: z.string().min(1).max(30).optional(),
    // Admin no se registra por API (SEC-T-01): el enum lo excluye deliberadamente.
    role: z.enum(['organizer', 'vendor']),
    preferredLanguage: z.enum(SUPPORTED_LANGUAGES).optional(),
    captchaToken: z.string().min(1),
  })
  .strict();

export type RegisterUserRequest = z.infer<typeof RegisterUserRequestSchema>;
