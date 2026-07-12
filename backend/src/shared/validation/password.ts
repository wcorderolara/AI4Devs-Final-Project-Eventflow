// Política de contraseña centralizada (US-094 / BE-001; alineada en US-001 / BE-003 a Doc 19 §11.2).
// Reutilizada por register, password reset y change-password para garantizar una única política.
// Política MVP canónica (Doc 19 §11.2, PO/BA Decisions US-001): mínimo 10 caracteres, al menos
// una letra y un número, distinta del localpart del email (regla cross-field aplicada en el DTO
// que conoce el email). No se loguea ningún valor (SEC-07).
import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 256;

/** Schema Zod de contraseña conforme a la política mínima del MVP (VR-02, Doc 19 §11.2). */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH)
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), {
    message: 'La contraseña debe incluir al menos una letra y un número',
  });

/**
 * Regla cross-field VR-02 (Doc 19 §11.2): la contraseña no puede ser igual al localpart del
 * email (comparación case-insensitive). Se invoca desde los DTOs que reciben ambos campos.
 */
export function passwordEqualsEmailLocalpart(password: string, email: string): boolean {
  const localpart = email.split('@')[0] ?? '';
  return localpart.length > 0 && password.toLowerCase() === localpart.toLowerCase();
}
