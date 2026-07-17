// Query DTO — Comparador de Quotes (US-057 / BE-001). EC-01 (categoryCode ausente) se detecta
// en el UseCase como `400 INVALID_FILTERS` para preservar el código estable del contrato; por
// eso la Zod schema deja el campo opcional (una schema `.strict()` con `required` emitiría
// `400 VALIDATION_ERROR` desde el middleware de validación, incumpliendo D1).
import { z } from 'zod';

export const CompareQuotesQuerySchema = z
  .object({
    categoryCode: z
      .string()
      .min(1, 'categoryCode must not be empty')
      .max(64, 'categoryCode must be at most 64 characters')
      .optional(),
  })
  .strict();

export type CompareQuotesQuery = z.infer<typeof CompareQuotesQuerySchema>;

/**
 * Param DTO — `:id` del evento en `GET /api/v1/events/:id/quotes/compare` (US-057).
 * Nota: el resto del módulo usa `:eventId` (US-096); esta ruta preserva `:id` según §7 del
 * Tech Spec para el contrato estable con el frontend.
 */
export const CompareQuotesEventIdParamSchema = z.object({ id: z.string().uuid() }).strict();
export type CompareQuotesEventIdParam = z.infer<typeof CompareQuotesEventIdParamSchema>;
