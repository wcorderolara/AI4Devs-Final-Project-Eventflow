// Adapter — DomainEventLogger estructurado (US-096 / OBS-001). Solo metadatos seguros (SEC-09).
//
// Delega en el logger global (`shared/infrastructure/logger`) manteniendo el shape canónico:
//   `{ event: string, ...seguros }` — sin PII, brief, conditions ni razones libres.
//
// Los campos aceptados vienen 1:1 de `DomainEventLogger.emit` (contrato del puerto). El adapter
// clasifica por convención sufijo:
//   - `*.limit_reached` → `warn`   (evento operativo umbral, no falla — US-050).
//   - `*.failed`        → `error`  (falla real de un job/batch — US-053).
//   - resto             → `info`   (eventos de dominio y auditoría).
import type { DomainEventLogger } from '../../shared/observability/domain-event-logger.js';
import { logger } from '../../shared/infrastructure/logger/index.js';

export class StructuredDomainEventLogger implements DomainEventLogger {
  emit: DomainEventLogger['emit'] = (event, data) => {
    if (event.endsWith('.limit_reached')) {
      logger.warn({ event, ...data });
      return;
    }
    if (event.endsWith('.failed')) {
      logger.error({ event, ...data });
      return;
    }
    logger.info({ event, ...data });
  };
}
