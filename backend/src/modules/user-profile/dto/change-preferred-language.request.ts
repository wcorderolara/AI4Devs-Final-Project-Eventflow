// Request DTO — Cambiar idioma preferido (US-094 / BE-001). AC-04; VR-05.
import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';

export const ChangePreferredLanguageSchema = z
  .object({
    preferredLanguage: z.enum(SUPPORTED_LANGUAGES),
  })
  .strict();

export type ChangePreferredLanguageDto = z.infer<typeof ChangePreferredLanguageSchema>;
