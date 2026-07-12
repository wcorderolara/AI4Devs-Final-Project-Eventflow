import type { Role } from '@/shared/authorization';

export type { Role };

export interface User {
  id: string;
  email: string;
  displayName: string;
}

/** Frontend model (Doc 15 §24). */
export interface AuthSession {
  user: User;
  role: Role;
  locale: string;
}

/**
 * DTO espejo del backend — `GET /api/v1/users/me` 200 (path canónico Doc 16 §23; alineado en
 * US-003 / EMERGENT-001: el mock `/auth/me` de US-106 quedó obsoleto). Envelope estándar con
 * `AuthUserResponse` (US-094).
 */
export interface UsersMeEnvelopeDTO {
  data: {
    id: string;
    email: string;
    name: string;
    role: 'organizer' | 'vendor' | 'admin';
    status: 'active' | 'suspended';
    preferredLanguage: string;
    phone: string | null;
    createdAt: string;
    updatedAt: string;
  };
  meta: { correlationId: string; timestamp?: string };
}

/** Shape expuesta por `useSession()`. No incluye `permissions` (backend) ni `locale` (useLocale). */
export interface SessionState {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}
