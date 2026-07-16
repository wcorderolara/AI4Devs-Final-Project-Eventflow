// Request DTO — Crear VendorService (US-044 / BE-001, AC-01a, VR-01..06, EC-01/03/05).
// `strict()` rechaza extras (defensa profunda). `base_price` es string con regex
// `^\d+(\.\d{1,2})?$` (numeric(14,2) sin pérdida en JSON). Categoría se valida en el use case
// (existencia + activa) para permitir mensaje `INVALID_CATEGORY` uniforme.
import { z } from 'zod';
import { VENDOR_SERVICE_CURRENCY_CODES } from '../../domain/vendor-service.js';

const PACKAGE_NAME_MIN = 2;
const PACKAGE_NAME_MAX = 150;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 2000;

export const CreateVendorServiceRequestSchema = z
  .object({
    package_name: z
      .string()
      .trim()
      .min(PACKAGE_NAME_MIN, 'package_name must be at least 2 characters')
      .max(PACKAGE_NAME_MAX, 'package_name must be at most 150 characters'),
    description: z
      .string()
      .trim()
      .min(DESCRIPTION_MIN, 'description must be at least 10 characters')
      .max(DESCRIPTION_MAX, 'description must be at most 2000 characters'),
    base_price: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'base_price must be a non-negative decimal with up to 2 decimals')
      // numeric(14,2) → hasta 12 dígitos enteros. Rechazamos strings más largos para no
      // depender del CHECK de la BD para feedback al usuario.
      .refine((v) => v.split('.')[0]!.length <= 12, {
        message: 'base_price integer part must be at most 12 digits',
      }),
    currency_code: z.enum(VENDOR_SERVICE_CURRENCY_CODES, {
      errorMap: () => ({ message: 'currency_code must be one of GTQ, EUR, MXN, COP, USD' }),
    }),
    service_category_id: z.string().uuid('service_category_id must be a valid UUID'),
  })
  .strict();

export type CreateVendorServiceRequest = z.infer<typeof CreateVendorServiceRequestSchema>;
