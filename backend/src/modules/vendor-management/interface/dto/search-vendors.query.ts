// Query DTO — Directorio de vendors (US-045 / BE-002, AC-01..04, EC-01..05).
// Validación estricta con `strict()` (defensa profunda) + refines cross-field:
//   - `currency` requerido cuando hay `priceMin` o `priceMax` (D5 / EC-02).
//   - `priceMin <= priceMax` cuando ambos están (VR-01 / EC-01).
// Los precios se aceptan como string con regex `^\d+(\.\d{1,2})?$` para preservar la
// precisión de `numeric(14,2)` a través de JSON (mismo criterio que US-044 `basePrice`).
// La existencia y activación de slugs (`categoryCode`, `locationCode`) se resuelve en el
// use case (`SearchVendorsUseCase`) para producir un mensaje uniforme `INVALID_FILTERS`
// que enumere todos los inválidos a la vez.
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../../shared/constants/currencies.js';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const PRICE_RE = /^\d+(\.\d{1,2})?$/;
const LIMIT_MIN = 1;
const LIMIT_MAX = 50;
const LIMIT_DEFAULT = 20;

export const SearchVendorsQuerySchema = z
  .object({
    categoryCode: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(SLUG_RE, 'categoryCode must be a slug')
      .optional(),
    locationCode: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(SLUG_RE, 'locationCode must be a slug')
      .optional(),
    priceMin: z
      .string()
      .regex(PRICE_RE, 'priceMin must be a non-negative decimal with up to 2 decimals')
      .refine((v) => v.split('.')[0]!.length <= 12, {
        message: 'priceMin integer part must be at most 12 digits',
      })
      .optional(),
    priceMax: z
      .string()
      .regex(PRICE_RE, 'priceMax must be a non-negative decimal with up to 2 decimals')
      .refine((v) => v.split('.')[0]!.length <= 12, {
        message: 'priceMax integer part must be at most 12 digits',
      })
      .optional(),
    currency: z
      .enum(SUPPORTED_CURRENCIES, {
        errorMap: () => ({ message: 'currency must be one of GTQ, EUR, MXN, COP, USD' }),
      })
      .optional(),
    cursor: z.string().min(1).max(512).optional(),
    limit: z.coerce
      .number({ invalid_type_error: 'limit must be an integer' })
      .int()
      .min(LIMIT_MIN, `limit must be >= ${LIMIT_MIN}`)
      .max(LIMIT_MAX, `limit must be <= ${LIMIT_MAX}`)
      .default(LIMIT_DEFAULT),
  })
  .strict()
  .superRefine((q, ctx) => {
    if ((q.priceMin !== undefined || q.priceMax !== undefined) && q.currency === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currency'],
        message: 'currency_required_with_price',
      });
    }
    if (
      q.priceMin !== undefined &&
      q.priceMax !== undefined &&
      Number(q.priceMin) > Number(q.priceMax)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceMin'],
        message: 'priceMin must be <= priceMax',
      });
    }
  });

export type SearchVendorsQuery = z.infer<typeof SearchVendorsQuerySchema>;

export const SEARCH_VENDORS_LIMIT_DEFAULT = LIMIT_DEFAULT;
export const SEARCH_VENDORS_LIMIT_MAX = LIMIT_MAX;
