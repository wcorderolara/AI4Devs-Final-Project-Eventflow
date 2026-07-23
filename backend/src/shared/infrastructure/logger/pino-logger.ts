// US-113 (PB-P2-010 / BE-004). Instancia Pino singleton — JSON estructurado con
// shape estable `{level, timestamp, service, env, version, correlationId,
// msg, ...context}` (D2 / AC-01), redacción centralizada de secrets + PII
// (D3 / AC-03/04) y propagación de `correlationId` via `AsyncLocalStorage`
// (D4 / AC-05..06). Sink stdout único (D5 / AC-08). Sin transports adicionales.
//
// La instancia se expone via `src/shared/logger.ts` (BE-005) para consumidores;
// esta ruta interna sólo la usa el request-logger middleware (BE-006) y los
// tests. Deviation D-01 documenta la coexistencia con el stub console-based
// legacy en `src/shared/infrastructure/logger/index.ts`.
import pino, { type Logger } from 'pino';
import { config } from '../../../config/env.js';
import { getCorrelationId } from '../../context/correlation-id.js';
import { redactSecrets, redactPII } from './redactors.js';
import { resolveServiceVersion } from './service-version.js';

/** Nombre del servicio inyectado en cada log line. MVP single-service. */
const SERVICE_NAME = 'backend-api';

/** Versión resuelta del servicio (env `SERVICE_VERSION` o `package.json.version`). */
const SERVICE_VERSION = resolveServiceVersion();

/**
 * Instancia Pino con:
 *   * `level` desde env (`LOG_LEVEL`).
 *   * `messageKey='msg'` (D2).
 *   * `timestamp` ISO 8601 estable.
 *   * `formatters.level` que emite el nombre del nivel textual (`"info"` en vez
 *     de `30`) para uniformidad de contract (AC-01).
 *   * `formatters.log` que aplica `redactSecrets` + `redactPII` sobre CADA
 *     objeto emitido (D3).
 *   * `mixin` que inyecta `service/env/version/correlationId` en cada línea
 *     (D2, D4).
 *   * `transport: pino-pretty` sólo si `LOG_PRETTY=true` (development-only —
 *     el `env.ts` hace fail-fast si se activa fuera de dev).
 */
export const pinoLogger: Logger = pino({
  level: config.LOG_LEVEL,
  messageKey: 'msg',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label): { level: string } => ({ level: label }),
    log: (obj): Record<string, unknown> => {
      const withSecrets = redactSecrets(obj);
      const withPII = redactPII(
        withSecrets,
        config.NODE_ENV,
        config.LOG_INCLUDE_PII,
      );
      return withPII as Record<string, unknown>;
    },
  },
  mixin: () => ({
    service: SERVICE_NAME,
    env: config.NODE_ENV,
    version: SERVICE_VERSION,
    correlationId: getCorrelationId(),
  }),
  transport: config.LOG_PRETTY ? { target: 'pino-pretty' } : undefined,
});
