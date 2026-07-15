// Schemas de validación cliente del wizard (US-040 / FE-003..006). Espejo estricto del contrato
// backend (`CreateVendorProfileRequestSchema`) — VR-01..09, D2, D4. Los mensajes son claves
// i18n del namespace `vendor.profile.validation`.
import { z } from 'zod';

export const SUPPORTED_LANGUAGES = ['es-LATAM', 'es-ES', 'pt', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const basicInfoSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'businessNameLength')
    .max(150, 'businessNameLength'),
  bio: z.string().trim().min(50, 'bioLength').max(1000, 'bioLength'),
});
export type BasicInfoValues = z.infer<typeof basicInfoSchema>;

export const locationCategoriesSchema = z.object({
  locationId: z.string().uuid('locationRequired'),
  categoryIds: z.array(z.string().uuid()).min(1, 'categoriesRange').max(3, 'categoriesRange'),
});
export type LocationCategoriesValues = z.infer<typeof locationCategoriesSchema>;

export const languagesSchema = z.object({
  languages: z.array(z.enum(SUPPORTED_LANGUAGES)).min(1, 'languagesRequired'),
});
export type LanguagesValues = z.infer<typeof languagesSchema>;

/** Estado agregado del wizard (unión de los pasos). */
export interface VendorProfileWizardState {
  businessName: string;
  bio: string;
  locationId: string;
  categoryIds: string[];
  languages: SupportedLanguage[];
}

export const emptyWizardState: VendorProfileWizardState = {
  businessName: '',
  bio: '',
  locationId: '',
  categoryIds: [],
  languages: [],
};
