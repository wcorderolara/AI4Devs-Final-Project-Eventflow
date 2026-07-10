// Barrel export del módulo de authorization (UX-only — ADR-FE-003/015).
export {
  type Role,
  ROLE_WHITELIST,
  COOKIE_SESSION,
  COOKIE_ROLE,
  type SessionClaims,
  isRole,
} from './types';
export { roleGuardMiddleware } from './roleGuardMiddleware';
export { RoleGuard, type RoleGuardProps } from './RoleGuard';
// NOTA (US-106): `SessionProvider`/`useSession` se movieron a `@/shared/auth-session` (hidratación
// real vía `useQuery(['me'])`). Este módulo conserva tipos de rol + middleware UX + `<RoleGuard>`.
