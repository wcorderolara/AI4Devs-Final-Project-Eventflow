import { z } from 'zod';

// Envelope de error backend (Doc 16 §ProblemDetails-like). `details` flexible para no romper con
// variaciones menores del backend.
const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export interface ParsedErrorEnvelope {
  code: string;
  message: string;
  details?: unknown;
}

/** Valida el envelope de error con Zod. Retorna `null` si la estructura no coincide. */
export function parseErrorEnvelope(body: unknown): ParsedErrorEnvelope | null {
  const result = errorEnvelopeSchema.safeParse(body);
  if (!result.success) return null;
  return result.data.error;
}
