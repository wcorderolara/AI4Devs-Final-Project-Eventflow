// Request DTO — Editar VendorProfile (US-041 / BE-001, AC-07, VR-01..09).
// Todos los campos opcionales; Zod `.strict()` rechaza extras (slug, status, vendor_user_id,
// categories, category_change_count → EC-01/EC-02, NT-04..06). `.refine` bloquea body vacío
// (VR-09 / NT-07).
import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../../../../shared/constants/languages.js';

export const UpdateVendorProfileRequestSchema = z
  .object({
    business_name: z
      .string()
      .trim()
      .min(2, 'business_name must be at least 2 characters')
      .max(150, 'business_name must be at most 150 characters')
      .optional(),
    bio: z
      .string()
      .trim()
      .min(50, 'bio must be at least 50 characters')
      .max(1000, 'bio must be at most 1000 characters')
      .optional(),
    location_id: z.string().uuid('location_id must be a valid UUID').optional(),
    languages_supported: z
      .array(z.enum(SUPPORTED_LANGUAGES))
      .min(1, 'languages_supported must include at least one language')
      .optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'no fields to update',
  });

export type UpdateVendorProfileRequest = z.infer<typeof UpdateVendorProfileRequestSchema>;

/**
 * Campos "mayores" (D1) que disparan re-pending automático desde `status='approved'`.
 * Fuente de verdad centralizada — el use case y el frontend (tracking de dirty) leen esta lista.
 */
export const MAJOR_UPDATE_FIELDS = ['business_name', 'location_id'] as const;
export type MajorUpdateField = (typeof MAJOR_UPDATE_FIELDS)[number];

/** True cuando el body PATCH contiene al menos un campo mayor. Independiente de la BD. */
export function hasMajorField(body: UpdateVendorProfileRequest): boolean {
  return MAJOR_UPDATE_FIELDS.some((k) => k in body);
}
