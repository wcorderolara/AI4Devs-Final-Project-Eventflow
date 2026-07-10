// Roles MVP (Doc 5 §5). Sin multi-rol simultáneo, sin roles colaborativos.
export type Role = 'organizer' | 'vendor' | 'admin';

export const ROLE_WHITELIST: readonly Role[] = ['organizer', 'vendor', 'admin'] as const;

// Cookies leídas por el middleware UX (las emite el backend en US-108).
// `eventflow_session`: HTTP-only (US-105 solo lee presencia). `eventflow_role`: no HTTP-only,
// claim UX no firmado, valor ∈ ROLE_WHITELIST.
export const COOKIE_SESSION = 'eventflow_session';
export const COOKIE_ROLE = 'eventflow_role';

export interface SessionClaims {
  isAuthenticated: boolean;
  role: Role | null;
}

/** Type guard: valida un valor de cookie contra la whitelist de roles (EC-01). */
export function isRole(value: string | null | undefined): value is Role {
  return value != null && (ROLE_WHITELIST as readonly string[]).includes(value);
}
