// US-016 / OBS-001 — Logger estructurado `admin.event.view`. Propaga `correlationId` desde el
// header/middleware y sella `latency_ms` + `result`. Reutiliza el logger global (US-113) para
// mantener el shape canónico de logs del proyecto.
import { logger } from '../../../shared/infrastructure/logger/index.js';

export type AdminEventViewResult = 'ok' | 'not_found' | 'forbidden' | 'bad_request' | 'error';

export interface AdminEventViewLogInput {
  actorUserId: string | null;
  targetEventId: string;
  correlationId: string | null;
  latencyMs: number;
  result: AdminEventViewResult;
}

export interface AdminEventAuditLogger {
  logView(input: AdminEventViewLogInput): void;
}

export class StructuredAdminAuditLogger implements AdminEventAuditLogger {
  logView(input: AdminEventViewLogInput): void {
    logger.info({
      event: 'admin.event.view',
      actorUserId: input.actorUserId,
      targetEventId: input.targetEventId,
      correlationId: input.correlationId,
      latencyMs: input.latencyMs,
      result: input.result,
    });
  }
}
