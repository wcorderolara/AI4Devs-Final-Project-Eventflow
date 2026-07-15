// Request DTO — Cambiar categorías del vendor (US-042 / BE-001, EC-04, D5, D6).
// Zod `.strict()` rechaza campos extra; `.refine` garantiza 1..5 UUIDs distintos tras
// normalizar a `Set`. La validación de existencia/actividad de las categorías vive en el
// use case (EC-05) — este DTO valida solo shape y cardinalidad.
import { z } from 'zod';

export const ChangeVendorCategoriesRequestSchema = z
  .object({
    service_category_ids: z
      .array(z.string().uuid('service_category_ids must contain valid UUIDs'))
      .min(1, 'service_category_ids must contain between 1 and 5 items')
      .max(5, 'service_category_ids must contain between 1 and 5 items'),
  })
  .strict()
  .refine((obj) => new Set(obj.service_category_ids).size === obj.service_category_ids.length, {
    message: 'service_category_ids must not contain duplicates',
    path: ['service_category_ids'],
  });

export type ChangeVendorCategoriesRequest = z.infer<typeof ChangeVendorCategoriesRequestSchema>;
