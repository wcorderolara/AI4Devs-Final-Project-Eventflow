// AuthUserResponseDto — shape público canónico de usuario (US-094 / BE-001). AC-01/AC-03.
// Compartido: lo devuelven `identity-access` (register/login) y `user-profile` (GET/PATCH /me).
// Vive en `shared` porque ambos módulos lo serializan y no pueden importarse entre sí.
// NUNCA incluye passwordHash, cookie, tokens ni captcha secrets (SEC-07).
import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../constants/languages.js';
import type { AuthUser } from '../auth/types.js';

export const AuthUserResponseSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['organizer', 'vendor', 'admin']),
    status: z.enum(['active', 'suspended']),
    preferredLanguage: z.enum(SUPPORTED_LANGUAGES),
    phone: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type AuthUserResponse = z.infer<typeof AuthUserResponseSchema>;

/** Mapea la vista de dominio `AuthUser` al DTO público serializable (ISO 8601 en fechas). */
export function toAuthUserResponse(user: AuthUser): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    preferredLanguage: user.preferredLanguage,
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
