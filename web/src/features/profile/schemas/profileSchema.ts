import { z } from 'zod';

/** Idiomas soportados (single source of truth alineado con `shared/i18n/config`). */
export const PREFERRED_LANGUAGES = ['es-LATAM', 'es-ES', 'pt', 'en'] as const;

/**
 * Schema del form de datos básicos (US-006 / FE-002). Copia disciplinada del backend
 * `UpdateCurrentUserProfileSchema`: `name` 2..80 post-trim, `phone` opcional (<=30), idioma
 * dentro del set cerrado. Los mensajes son claves i18n (namespace `profile`).
 */
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'validation.nameMin')
    .max(80, 'validation.nameMax'),
  phone: z
    .string()
    .trim()
    .max(30, 'validation.phoneMax')
    .optional()
    .or(z.literal('')),
  preferredLanguage: z.enum(PREFERRED_LANGUAGES),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
