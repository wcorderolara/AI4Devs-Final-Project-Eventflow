// US-031 (PB-P1-017 / BE-002) — Puerto del repositorio de bulk confirm por ítem.
// Cada `confirmConditional` ejecuta un `UPDATE` condicional atómico row-level y, si `affected=0`,
// realiza una segunda query de diagnóstico para mapear el `error.code` específico. La iteración
// del batch la gobierna el use case (no envuelve una transacción global — decisión PO PB-P1-017).
import type { BulkItemErrorCode } from '../dto/confirm-bulk.dto.js';

export interface ConfirmConditionalInput {
  taskId: string;
  eventId: string;
  actorId: string;
  correlationId?: string;
  confirmedAt: Date;
}

export type ConfirmConditionalOutcome =
  | { accepted: true }
  | { accepted: false; code: BulkItemErrorCode };

export interface AITaskBulkRepository {
  confirmConditional(input: ConfirmConditionalInput): Promise<ConfirmConditionalOutcome>;
}
