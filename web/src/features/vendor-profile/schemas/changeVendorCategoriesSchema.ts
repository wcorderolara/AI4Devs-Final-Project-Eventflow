// Schema Zod espejo del backend (US-042 / FE-002, EC-04). Se aplica en RHF antes de invocar
// el endpoint — la fuente de verdad es el backend, este schema solo evita round-trips triviales.
import { z } from 'zod';

export const changeVendorCategoriesSchema = z.object({
  categoryIds: z
    .array(z.string().uuid())
    .min(1, 'categoriesRange')
    .max(5, 'categoriesRange'),
});

export type ChangeVendorCategoriesValues = z.infer<typeof changeVendorCategoriesSchema>;

export const CATEGORY_CHANGE_MAX = 5;
