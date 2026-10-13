import { httpGetData } from '@/shared/api-client';
import type { AdminUsersListDTO, AdminUsersQuery } from './adminUsersApi.types';

export const adminUsersApi = {
  async list(query: AdminUsersQuery = {}): Promise<AdminUsersListDTO> {
    return httpGetData<AdminUsersListDTO>('/admin/users', {
      query: {
        role: query.role,
        status: query.status,
        q: query.q,
        cursor: query.cursor,
        limit: query.limit,
      },
    });
  },
};
