// Request DTO — respuesta single-shot del vendor (US-052 / BE-001). AC-04 / EC-03..06.
// Zod estricto con .refine() para la suma del breakdown (tolerancia ±0.01) y validación de
// rango de `valid_until`. Nota SEC (DEV-04): `currency_code` se ignora server-side; se acepta
// en el body para no romper clientes, pero el UC lo descarta y usa `event.currency`.
import { z } from 'zod';

const DECIMAL_2 = /^\d+(\.\d{1,2})?$/;

export const respondQuoteBreakdownItemSchema = z
  .object({
    label: z.string().min(1).max(150),
    amount: z.string().regex(DECIMAL_2),
  })
  .strict();

export const respondQuoteRequestBodySchema = z
  .object({
    total_price: z.string().regex(DECIMAL_2),
    breakdown: z.array(respondQuoteBreakdownItemSchema).min(1).max(20),
    conditions: z.string().max(2000).optional(),
    // ISO YYYY-MM-DD; el rango real (today..today+90) lo enforce el UC (necesita clock inyectado).
    valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    // Aceptado pero ignorado — currency del evento manda (DEV-04 / SEC-04).
    currency_code: z.string().optional(),
  })
  .strict()
  .refine(
    (body) => Number.parseFloat(body.total_price) > 0,
    { message: 'INVALID_TOTAL', path: ['total_price'] },
  )
  .refine(
    (body) => body.breakdown.every((it) => Number.parseFloat(it.amount) >= 0),
    { message: 'INVALID_BREAKDOWN_ITEM', path: ['breakdown'] },
  )
  .refine(
    (body) => {
      const sum = body.breakdown.reduce(
        (acc, item) => acc + Number.parseFloat(item.amount),
        0,
      );
      return Math.abs(sum - Number.parseFloat(body.total_price)) <= 0.01;
    },
    { message: 'INVALID_BREAKDOWN_SUM', path: ['breakdown'] },
  );

export type RespondQuoteRequestBody = z.infer<typeof respondQuoteRequestBodySchema>;
export type RespondQuoteBreakdownItem = z.infer<typeof respondQuoteBreakdownItemSchema>;
