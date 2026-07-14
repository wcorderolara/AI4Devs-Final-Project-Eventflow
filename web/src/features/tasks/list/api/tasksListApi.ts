// US-027 (PB-P1-018 / FE-001) — Cliente API del listado paginado del checklist.
// Endpoint canónico: `GET /api/v1/events/:eventId/tasks`. Cookies HTTP-only vía
// `credentials: 'include'` (helper canónico). Filtros tolerantes lado servidor: la UI envía
// sólo los valores que el usuario eligió y confía en que valores inválidos se descarten con
// log (EC-01). Convierte `aiGenerated: boolean` a string `'true'|'false'`.
import { httpGet } from '@/shared/api-client';
import type {
  ListTasksParams,
  TaskListEnvelopeDTO,
  TaskListResult,
} from './tasksListApi.types';

export const tasksListApi = {
  async list(params: ListTasksParams): Promise<TaskListResult> {
    const { eventId, aiGenerated, ...rest } = params;
    const dto = await httpGet<TaskListEnvelopeDTO>(`/events/${eventId}/tasks`, {
      query: {
        status: rest.status,
        aiGenerated: aiGenerated === undefined ? undefined : String(aiGenerated),
        categoryCode: rest.categoryCode,
        // US-032 (FE-002): `range` sólo se envía si el usuario eligió un valor explícito;
        // ausente significa "usar default server-side" (`all`).
        range: rest.range,
        page: rest.page,
        pageSize: rest.pageSize,
      },
    });
    // US-033 (FE-003): propaga el agregado `progress` cuando el envelope lo trae. `undefined`
    // sólo ocurre en handlers de mock legacy o en respuestas de un backend previo a US-033.
    return { items: dto.data, pagination: dto.pagination, progress: dto.progress };
  },
};
