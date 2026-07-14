// US-028 (PB-P1-018 / FE-003) — Cliente API de la creación manual de EventTask.
// Endpoint canónico: `POST /api/v1/events/:eventId/tasks`. Cookies HTTP-only vía `httpPost`
// (que ya cablea `credentials: 'include'` y agrega `Content-Type: application/json`).
import { httpPost } from '@/shared/api-client';
import type { TaskListItemDTO } from '../../list/api/tasksListApi.types';

export interface CreateEventTaskPayload {
  title: string;
  description?: string | null;
  due_date?: string | null;
  category_code?: string | null;
}

export interface CreateEventTaskEnvelopeDTO {
  data: TaskListItemDTO;
  meta: { correlationId: string; timestamp: string };
}

export const tasksCreateApi = {
  async create(eventId: string, body: CreateEventTaskPayload): Promise<TaskListItemDTO> {
    const dto = await httpPost<CreateEventTaskEnvelopeDTO, CreateEventTaskPayload>(
      `/events/${eventId}/tasks`,
      { body },
    );
    return dto.data;
  },
};
