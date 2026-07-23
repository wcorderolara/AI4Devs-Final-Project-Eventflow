// US-114 (PB-P2-011 / BE-001). Zod schema strict para el header
// `X-Correlation-Id` (UUID v4). Rechaza cualquier otro shape (v1, v7,
// garbage, injection payloads) con mensaje descriptivo.
//
// Contrato (D3 · VR-01):
//   * `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`
//     — versión (`4`) en posición 15, variante RFC 4122 (`[89ab]`) en posición 20.
//   * Case-insensitive (`/i`).
//   * Sin coerción — el header ya llega como string.
//
// Uso:
//   const parsed = correlationIdSchema.safeParse(header);
//   if (!parsed.success) → 400 INVALID_CORRELATION_ID (BE-004).
import { z } from 'zod';

/** Regex UUID v4 estricto — rechaza v1/v7/garbage/injection payloads. */
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Zod schema aplicable al valor del header `X-Correlation-Id` (SEC-02, VR-01). */
export const correlationIdSchema = z.string().regex(UUID_V4_REGEX, {
  message: 'X-Correlation-Id must be a valid UUID v4',
});

export type CorrelationIdInput = z.infer<typeof correlationIdSchema>;
