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

/** DTO espejo del backend — `GET /api/v1/auth/me` 200 (Owner: US-108). */
export interface AuthSessionResponseDTO {
  user: { id: string; email: string; displayName: string };
  role: 'organizer' | 'vendor' | 'admin';
  locale: string;
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
