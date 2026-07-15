// Request DTO — Crear VendorProfile (US-040 / BE-002).
// Zod `.strict()` rechaza cualquier campo extra (VR-07: `vendor_user_id`, `status`, `slug` → 400).
// Los rangos siguen las Decisiones PO/BA: D2 (categorías 1-3), D4 (bio 50-1000).
import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../../../../shared/constants/languages.js';

export const CreateVendorProfileRequestSchema = z
  .object({
    business_name: z
      .string()
      .trim()
      .min(2, 'business_name must be at least 2 characters')
      .max(150, 'business_name must be at most 150 characters'),
    bio: z
      .string()
      .trim()
      .min(50, 'bio must be at least 50 characters')
      .max(1000, 'bio must be at most 1000 characters'),
    location_id: z.string().uuid('location_id must be a valid UUID'),
    languages_supported: z
      .array(z.enum(SUPPORTED_LANGUAGES))
      .min(1, 'languages_supported must include at least one language'),
    categories: z
      .array(z.string().uuid('categories must contain valid UUIDs'))
      .min(1, 'categories must include at least one category')
      .max(3, 'categories must include at most 3 categories'),
  })
  .strict();

export type CreateVendorProfileRequest = z.infer<typeof CreateVendorProfileRequestSchema>;
