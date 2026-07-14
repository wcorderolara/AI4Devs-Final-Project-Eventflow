// US-029 (PB-P1-018 / FE-004) — Cliente API para las 3 mutaciones (PATCH content/status + DELETE).
// Los tres endpoints devuelven envelope canónico `{ data, meta }` para PATCH; DELETE es 204 sin body.
import { httpPatch, httpDelete } from '@/shared/api-client';
import type { TaskListItemDTO } from '../../list/api/tasksListApi.types';
import type { CanonicalTaskStatus } from '../domain/taskStatusTransitions';

export interface UpdateEventTaskContentPayload {
  title?: string;
  description?: string | null;
  due_date?: string | null;
  category_code?: string | null;
}

export interface UpdateEventTaskStatusPayload {
  status: CanonicalTaskStatus;
}

interface TaskMutateEnvelopeDTO {
  data: TaskListItemDTO;
  meta: { correlationId: string; timestamp: string };
}

export const tasksMutateApi = {
  async updateContent(
    eventId: string,
    taskId: string,
    body: UpdateEventTaskContentPayload,
  ): Promise<TaskListItemDTO> {
    const dto = await httpPatch<TaskMutateEnvelopeDTO, UpdateEventTaskContentPayload>(
      `/events/${eventId}/tasks/${taskId}`,
      { body },
    );
    return dto.data;
  },

  async updateStatus(
    eventId: string,
    taskId: string,
    status: CanonicalTaskStatus,
  ): Promise<TaskListItemDTO> {
    const dto = await httpPatch<TaskMutateEnvelopeDTO, UpdateEventTaskStatusPayload>(
      `/events/${eventId}/tasks/${taskId}/status`,
      { body: { status } },
    );
    return dto.data;
  },

  async delete(eventId: string, taskId: string): Promise<void> {
    await httpDelete<void>(`/events/${eventId}/tasks/${taskId}`);
  },
};
