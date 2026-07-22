export type AdminUserRole = 'organizer' | 'vendor' | 'admin';
export type AdminUserStatus = 'active' | 'suspended';

export interface AdminUserDTO {
  id: string;
  email: string;
  name: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  phone: string | null;
  preferredLanguage: string;
  isSeed: boolean;
  createdAt: string;
}

export interface AdminUsersListDTO {
  items: AdminUserDTO[];
  pagination: {
    nextCursor: string | null;
    pageSize: number;
  };
}

export interface AdminUsersEnvelope {
  data: AdminUsersListDTO;
  meta: { correlationId: string; timestamp: string };
}

export interface AdminUsersQuery {
  role?: AdminUserRole;
  status?: AdminUserStatus;
  q?: string;
  cursor?: string;
  limit?: number;
}
