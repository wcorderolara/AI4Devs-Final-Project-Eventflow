// correlationIdMiddleware (US-091 / BE-003 → US-114 / BE-004, Global). Doc 14
// §16; ADR-API-004; ADR-SEC-001.
//
// Contrato (US-114):
//   * Lee el header `X-Correlation-Id` del request si existe (D2).
//     - Si válido (UUID v4 strict per `correlationIdSchema` — D3) → reusa (AC-02).
//     - Si inválido → 400 `INVALID_CORRELATION_ID` con envelope de error y
//       `error.correlationId` server-generated (AC-03; SEC-02/SEC-04 —
//       nunca propaga el valor inválido del cliente).
//     - Si ausente/blank → genera UUID v4 con `crypto.randomUUID()` (AC-01).
//   * Setea `req.correlationId` (`express.d.ts` amplia el tipo) para
//     compatibilidad con controllers legacy que consumen `req.correlationId`
//     directamente.
//   * Setea `res.setHeader('x-correlation-id', ...)` en TODAS las responses
//     (AC-04) — incluso el 400 fail-fast del header inválido.
//   * Corre el resto de la cadena dentro de `correlationContext.run({correlationId}, next)`
//     para que Pino (US-113 mixin) inyecte el mismo `correlationId` en cada
//     línea emitida río abajo (AC-07).
//
// Ubicación en el pipeline (`app.ts`): PRIMER middleware personalizado, ANTES
// de `requestLogger` (US-113) y de cualquier auth/role/validation. Doc 14 §8.2.
// US-116 (PB-P2-013 · AC-06 · VR-04): `/health` y `/health/ready` NO propagan
// `X-Correlation-Id` a la response ni exponen `meta.correlationId` en el body.
// Los probes de infraestructura (App Runner cada ~10s) no participan del
// tracing correlativo del dominio; propagar el ID contaminaría el header y
// ensuciaría los logs con líneas duplicadas cada 10s. El bypass es sólo en
// **salida** — el header entrante sí se valida strict (defensa SEC-04) por
// paridad con el resto del pipeline; sólo se omite el `res.setHeader` y el
// wrapping del store. La lista canónica vive en `HEALTH_PATHS`.
import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { correlationContext } from '../../context/correlation-id.js';
import { correlationIdSchema } from '../../validation/correlation-id.schema.js';
import { failure } from '../../response/failure.js';
import { ErrorCodes } from '../../domain/errors/error-codes.js';
import { HEALTH_PATHS } from '../../constants/health-paths.js';

const CORRELATION_ID_HEADER = 'x-correlation-id';

export const correlationIdMiddleware: RequestHandler = (req, res, next) => {
  // US-116 · AC-06: bypass total para `/health*` — no lee, no setea, no propaga.
  // Coherente con la excepción explícita documentada en docs/16 §21.4 / ADR-API-004.
  if (HEALTH_PATHS.includes(req.path)) {
    next();
    return;
  }
  // Se accede directamente a `req.headers[...]` (case-insensitive normalizado
  // por Node.js) en vez de `req.header(name)` para permitir tests que
  // instancian el middleware con un mock request minimal (`{headers: {...}}`).
  const rawHeader = req.headers[CORRELATION_ID_HEADER];
  const single = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const trimmed = typeof single === 'string' ? single.trim() : undefined;

  let correlationId: string;

  if (!trimmed) {
    // AC-01: sin header o blank → server-generated UUID v4.
    correlationId = randomUUID();
  } else {
    const parsed = correlationIdSchema.safeParse(trimmed);
    if (!parsed.success) {
      // AC-03 · EC-02 · SEC-02/SEC-04: header inválido → 400 fail-fast con
      // `error.correlationId` server-generated (el valor inválido del cliente
      // NUNCA se propaga). El request se corta ANTES de auth/handlers.
      const serverGeneratedId = randomUUID();
      res.setHeader(CORRELATION_ID_HEADER, serverGeneratedId);
      const envelope = failure(
        ErrorCodes.INVALID_CORRELATION_ID,
        'X-Correlation-Id must be a valid UUID v4',
        undefined,
        serverGeneratedId,
      );
      res.status(400).json(envelope);
      return;
    }
    // AC-02: header UUID v4 válido → reuso.
    correlationId = parsed.data;
  }

  req.correlationId = correlationId;
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  // AC-07 · D5: correr el resto de la cadena dentro del store — Pino (US-113
  // mixin) heredará el mismo `correlationId` en cada línea emitida río abajo.
  correlationContext.run({ correlationId }, () => next());
};
