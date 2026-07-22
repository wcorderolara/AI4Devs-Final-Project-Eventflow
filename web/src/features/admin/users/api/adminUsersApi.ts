import { httpGet } from '@/shared/api-client';
import type { AdminUsersEnvelope, AdminUsersListDTO, AdminUsersQuery } from './adminUsersApi.types';

export const adminUsersApi = {
  async list(query: AdminUsersQuery = {}): Promise<AdminUsersListDTO> {
    const envelope = await httpGet<AdminUsersEnvelope>('/admin/users', {
      query: {
        role: query.role,
        status: query.status,
        q: query.q,
        cursor: query.cursor,
        limit: query.limit,
      },
    });
    return envelope.data;
  },
};
