// US-114 (PB-P2-011 / BE-003). `respond` — thin wrapper sobre los envelope
// helpers existentes (`success()` + `failure()` de US-093) que leen el
// `correlationId` desde el `AsyncLocalStorage` (US-113) en vez de recibirlo
// como argumento explícito.
//
// Contrato (D4):
//   * `respond.success(res, data[, status])` — 200 por default, envelope
//     canónico `{data, meta: {correlationId, timestamp}}` per docs/16 §426.
//   * `respond.error(res, code, message, status[, details])` — envelope
//     `{error: {code, message, correlationId, details?}}` per docs/16 §652/§653.
//
// Coexistencia (D-01 del execution record):
//   * Los helpers legacy `success(data, correlationId, ...)` y `failure(code,
//     message, details, correlationId)` de `src/shared/response/{success,failure}.ts`
//     SIGUEN vigentes — cientos de callers los usan pasando `req.correlationId`
//     explícito. No se migran en US-114.
//   * `respond` está pensado para consumidores nuevos que prefieren no
//     acarrear el correlationId por prop drilling. Interna­mente delega a
//     `success()` / `failure()` — mismo shape emitido.
//
// Semántica del correlationId:
//   * `getCorrelationId()` retorna el valor del store (setado por
//     `correlationIdMiddleware` — US-114 BE-004). Fuera de HTTP context (jobs
//     sin `.run()`, boot antes de middlewares) retorna `null` — se emite `''`
//     como fallback para preservar el tipo `string` del envelope (VR-05).
import type { Response } from 'express';
import { getCorrelationId } from '../context/correlation-id.js';
import { success as buildSuccessEnvelope } from '../response/success.js';
import { failure as buildFailureEnvelope } from '../response/failure.js';
import type { ErrorDetail } from '../response/types.js';
import type { ErrorCode } from '../domain/errors/error-codes.js';

/**
 * Fallback determinístico cuando `getCorrelationId()` retorna `null` (fuera
 * de HTTP context). El envelope canónico tipa `correlationId: string`; usamos
 * `''` en vez de `null` para preservar el shape.
 */
function currentCorrelationId(): string {
  return getCorrelationId() ?? '';
}

/** Helper canónico para nuevos handlers que no requieran acarrear `req.correlationId`. */
export const respond = {
  /**
   * Emite 2xx con envelope de éxito. Lee el `correlationId` del contexto
   * AsyncLocalStorage (setado por `correlationIdMiddleware`).
   */
  success<T>(res: Response, data: T, status = 200): Response {
    const envelope = buildSuccessEnvelope<T>(data, currentCorrelationId());
    return res.status(status).json(envelope);
  },
  /**
   * Emite 4xx/5xx con envelope de error. `details` opcional (aplicable a
   * `VALIDATION_ERROR` / `BUSINESS_RULE_VIOLATION`; ver contract de
   * `failure()` — es opcional para otros codes).
   */
  error(
    res: Response,
    code: ErrorCode,
    message: string,
    status: number,
    details?: ErrorDetail[],
  ): Response {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- delega al overload runtime de failure()
    const envelope = (buildFailureEnvelope as any)(
      code,
      message,
      details,
      currentCorrelationId(),
    );
    return res.status(status).json(envelope);
  },
};
