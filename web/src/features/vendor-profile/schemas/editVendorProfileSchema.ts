// Schema cliente del `VendorProfileEditor` (US-041 / FE-002). Espejo del contrato backend
// `UpdateVendorProfileRequestSchema`. Los mensajes son claves i18n de `vendor.profile.validation`.
import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from './vendorProfileWizardSchema';

/**
 * Todos los campos son opcionales; el `superRefine` bloquea envíos sin ningún cambio (VR-09).
 * `slug`/`status`/`categories` NO están permitidos; el DTO backend con `.strict()` los rechaza
 * como defensa en profundidad — a nivel form no se exponen.
 */
export const editVendorProfileSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(2, 'businessNameLength')
      .max(150, 'businessNameLength')
      .optional(),
    bio: z
      .string()
      .trim()
      .min(50, 'bioLength')
      .max(1000, 'bioLength')
      .optional(),
    locationId: z.string().uuid('locationRequired').optional(),
    languages: z
      .array(z.enum(SUPPORTED_LANGUAGES))
      .min(1, 'languagesRequired')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.values(data).every((v) => v === undefined || (Array.isArray(v) && v.length === 0))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'noFieldsToUpdate',
      });
    }
  });

export type EditVendorProfileValues = z.infer<typeof editVendorProfileSchema>;

/** D1: campos mayores del form (paridad con backend `MAJOR_UPDATE_FIELDS`). */
export const MAJOR_EDITOR_FIELDS = ['businessName', 'locationId'] as const;
export type MajorEditorField = (typeof MAJOR_EDITOR_FIELDS)[number];
