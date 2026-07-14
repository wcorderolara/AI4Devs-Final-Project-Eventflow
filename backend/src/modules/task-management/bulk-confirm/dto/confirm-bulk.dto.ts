// US-031 (PB-P1-017 / BE-001) — DTOs de request/response para el bulk confirm HITL.
// `BulkItemErrorCode` cubre EC-03..EC-06 y AC-05 (idempotencia por `TASK_NOT_PENDING`).

export const BULK_ITEM_ERROR_CODES = [
  'TASK_NOT_FOUND',
  'TASK_NOT_IN_EVENT',
  'TASK_NOT_AI',
  'TASK_NOT_PENDING',
] as const;

export type BulkItemErrorCode = (typeof BULK_ITEM_ERROR_CODES)[number];

export interface ConfirmAITasksBulkItemResult {
  taskId: string;
  accepted: boolean;
  error?: { code: BulkItemErrorCode; message: string };
}

export interface ConfirmAITasksBulkSummary {
  requested: number;
  deduped: number;
  accepted: number;
  rejected: number;
}

export interface ConfirmAITasksBulkResponseDto {
  results: ConfirmAITasksBulkItemResult[];
  summary: ConfirmAITasksBulkSummary;
}
