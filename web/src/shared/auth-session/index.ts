export { SessionProvider, SessionContext } from './SessionProvider';
export { useSession } from './useSession';
// `serverSession` NO se re-exporta aquí a propósito: importa `next/headers` y este barril lo
// consumen Client Components (`useSession`). Se importa por ruta desde Server Components:
// `import { getServerSessionClaims } from '@/shared/auth-session/serverSession'`.
export { useLogout } from './useLogout';
export { authApi } from './authApi';
export { mapUsersMeEnvelopeToAuthSession } from './authMappers';
export { handleQueryError, type OnError401Deps } from './onError401';
export type { User, AuthSession, UsersMeEnvelopeDTO, SessionState, Role } from './types';
