// Request DTO — Editar VendorService (US-044 / BE-002, AC-01b).
// Parcial estricto — al menos 1 campo. `is_active` opcional (permite reactivar; el use case
// verifica el tope antes de aplicar).
import { z } from 'zod';
import { VENDOR_SERVICE_CURRENCY_CODES } from '../../domain/vendor-service.js';

export const UpdateVendorServiceRequestSchema = z
  .object({
    package_name: z
      .string()
      .trim()
      .min(2, 'package_name must be at least 2 characters')
      .max(150, 'package_name must be at most 150 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .min(10, 'description must be at least 10 characters')
      .max(2000, 'description must be at most 2000 characters')
      .optional(),
    base_price: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'base_price must be a non-negative decimal with up to 2 decimals')
      .refine((v) => v.split('.')[0]!.length <= 12, {
        message: 'base_price integer part must be at most 12 digits',
      })
      .optional(),
    currency_code: z
      .enum(VENDOR_SERVICE_CURRENCY_CODES, {
        errorMap: () => ({ message: 'currency_code must be one of GTQ, EUR, MXN, COP, USD' }),
      })
      .optional(),
    service_category_id: z
      .string()
      .uuid('service_category_id must be a valid UUID')
      .optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'no fields to update',
  });

export type UpdateVendorServiceRequest = z.infer<typeof UpdateVendorServiceRequestSchema>;
