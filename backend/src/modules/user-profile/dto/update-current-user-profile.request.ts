// Request DTO — Actualizar perfil propio (US-094 / BE-001). AC-04; VR-08.
// Estricto: campos inmutables (`email`, `role`, `status`, `password_hash`, `id`) NO se aceptan
// (unknown → rechazo). Solo `name`, `phone`, `preferredLanguage` son editables. Requiere ≥1 campo.
import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';

export const UpdateCurrentUserProfileSchema = z
  .object({
    name: z.string().min(1).max(80).trim().optional(),
    phone: z.string().min(1).max(30).nullable().optional(),
    preferredLanguage: z.enum(SUPPORTED_LANGUAGES).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Debe incluir al menos un campo editable (name, phone o preferredLanguage)',
  });

export type UpdateCurrentUserProfileDto = z.infer<typeof UpdateCurrentUserProfileSchema>;
