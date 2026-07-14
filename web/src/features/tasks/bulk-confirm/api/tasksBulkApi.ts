// US-031 (PB-P1-017 / FE-004) — Cliente API del bulk confirm HITL.
// Endpoint canónico: `POST /api/v1/events/:eventId/tasks/confirm-bulk` con `{ taskIds: string[] }`.
// Response envelope `{ data: { results, summary }, meta }`. El cliente sólo devuelve `data`.
import { httpPost } from '@/shared/api-client';

export type BulkItemErrorCode =
  | 'TASK_NOT_FOUND'
  | 'TASK_NOT_IN_EVENT'
  | 'TASK_NOT_AI'
  | 'TASK_NOT_PENDING';

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

export interface ConfirmAITasksBulkResponse {
  results: ConfirmAITasksBulkItemResult[];
  summary: ConfirmAITasksBulkSummary;
}

interface Envelope<T> {
  data: T;
  meta: { correlationId: string; timestamp: string };
}

export const tasksBulkApi = {
  async confirmBulk(eventId: string, taskIds: string[]): Promise<ConfirmAITasksBulkResponse> {
    const dto = await httpPost<Envelope<ConfirmAITasksBulkResponse>, { taskIds: string[] }>(
      `/events/${eventId}/tasks/confirm-bulk`,
      { body: { taskIds }, timeoutMs: 30_000 },
    );
    return dto.data;
  },
};
