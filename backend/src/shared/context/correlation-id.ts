// US-113 (PB-P2-010 / BE-002). `correlationContext` — `AsyncLocalStorage` singleton
// que propaga `correlationId` a lo largo de la cadena async del request (o del
// job), consumido por el `mixin` de Pino en `pino-logger.ts`.
//
// Contrato (D4):
//   * `correlationContext.run({ correlationId }, () => next())` en el middleware
//     `correlation-id` (US-114 / BE-004) o en el orquestador de jobs.
//   * `getCorrelationId()` retorna el valor actual o `null` si se invoca FUERA
//     de un `.run(...)` (EC-05: boot, jobs sin wrap, etc.). No lanza.
//
// La instancia es un singleton compartido — reusarla desde jobs (`EmitT7NotificationsJob`,
// `ExpireQuotesJob`, etc.) garantiza que los logs emitidos dentro del `.run(...)`
// del job hereden el `correlationId` operativo (p. ej. `job-emit-t7-<ISO8601>`).
//
// US-114 (PB-P2-011 / BE-002 / D7). Se agrega el helper `generateCorrelationId`
// que devuelve UUID v4 con prefijo opcional para jobs (patrón US-034 D5: p. ej.
// `job-emit-t7-<uuid>`). Sin acoplamiento con el middleware HTTP.
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/** Shape del store propagado por AsyncLocalStorage. */
export interface CorrelationStore {
  correlationId: string | null;
}

/**
 * Singleton `AsyncLocalStorage<CorrelationStore>`. NO se re-instancia — la
 * propagación async depende de una única instancia compartida por proceso.
 */
export const correlationContext = new AsyncLocalStorage<CorrelationStore>();

/**
 * Devuelve el `correlationId` actual del store si estamos dentro de un
 * `correlationContext.run(...)`, o `null` si estamos fuera (EC-06, AC-06).
 * Nunca lanza.
 */
export function getCorrelationId(): string | null {
  return correlationContext.getStore()?.correlationId ?? null;
}

/**
 * US-114 (D7): genera un `correlationId` UUID v4 con `prefix` opcional. Con
 * prefijo el shape es `<prefix>-<uuid v4>` (útil para trazar jobs cron sin
 * confundirlos con requests HTTP). Sin prefijo devuelve un UUID v4 puro que
 * matchea `UUID_V4_REGEX` de `correlation-id.schema.ts`.
 */
export function generateCorrelationId(prefix?: string): string {
  const uuid = randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}
