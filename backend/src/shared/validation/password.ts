// Política de contraseña centralizada (US-094 / BE-001). VR-02; SEC-05.
// Reutilizada por register, password reset y change-password para garantizar una única política.
// Mínimo 10 caracteres, al menos una mayúscula y un dígito. No se loguea ningún valor (SEC-07).
import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;

/** Schema Zod de contraseña conforme a la política mínima del MVP (VR-02). */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(200)
  .refine((v) => /[A-Z]/.test(v) && /[0-9]/.test(v), {
    message: 'La contraseña debe incluir al menos una mayúscula y un dígito',
  });
