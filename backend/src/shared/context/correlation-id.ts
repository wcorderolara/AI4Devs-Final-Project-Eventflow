// US-113 (PB-P2-010 / BE-002). `correlationContext` — `AsyncLocalStorage` singleton
// que propaga `correlationId` a lo largo de la cadena async del request (o del
// job), consumido por el `mixin` de Pino en `pino-logger.ts`.
//
// Contrato (D4):
//   * `correlationContext.run({ correlationId }, () => next())` en el middleware
//     `request-logger` (BE-006) o en el orquestador de jobs.
//   * `getCorrelationId()` retorna el valor actual o `null` si se invoca FUERA
//     de un `.run(...)` (EC-05: boot, jobs sin wrap, etc.). No lanza.
//
// La instancia es un singleton compartido — reusarla desde jobs (`EmitT7NotificationsJob`,
// `ExpireQuotesJob`, etc.) garantiza que los logs emitidos dentro del `.run(...)`
// del job hereden el `correlationId` operativo (p. ej. `job-emit-t7-<ISO8601>`).
import { AsyncLocalStorage } from 'node:async_hooks';

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
