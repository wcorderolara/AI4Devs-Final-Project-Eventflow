// US-031 (PB-P1-017 / BE-004) — Mapper puro `ConfirmConditionalOutcome → ConfirmAITasksBulkItemResult`.
// Los mensajes por defecto son en `en` para logs/tests; el frontend traduce a partir del `error.code`.
import type { ConfirmConditionalOutcome } from '../ports/ai-task-bulk.repository.js';
import type {
  BulkItemErrorCode,
  ConfirmAITasksBulkItemResult,
} from '../dto/confirm-bulk.dto.js';

const BULK_ITEM_ERROR_MESSAGES: Record<BulkItemErrorCode, string> = {
  TASK_NOT_FOUND: 'Task not found.',
  TASK_NOT_IN_EVENT: 'Task does not belong to this event.',
  TASK_NOT_AI: 'Task is not AI-generated.',
  TASK_NOT_PENDING: 'Task is no longer pending.',
};

export function mapOutcomeToResult(
  taskId: string,
  outcome: ConfirmConditionalOutcome,
): ConfirmAITasksBulkItemResult {
  if (outcome.accepted) return { taskId, accepted: true };
  return {
    taskId,
    accepted: false,
    error: { code: outcome.code, message: BULK_ITEM_ERROR_MESSAGES[outcome.code] },
  };
}
