// Servicio `state` + `nonce` anti-CSRF del flujo OAuth (US-008 / BE-002, SEC-03). Genera valores
// aleatorios criptográficos de un solo uso y los transporta en una cookie HTTP-only FIRMADA de
// corta vida (TTL `OAUTH_STATE_TTL_SECONDS`), en lugar de una tabla server-side (Tech Spec §4
// admite ambas; N-03 del execution record). En el callback: se compara el `state` de la query con
// el de la cookie (anti-CSRF) y se consume la cookie (single-use → anti-replay). El `nonce` se
// verifica contra el claim del `id_token` en el provider.
import { randomBytes } from 'node:crypto';
import { config } from '../../config/env.js';
import type { OAuthStateNonce } from '../../shared/auth/oauth.js';
import { signedJsonCookie } from './cookie-codec.js';

/** Nombre de la cookie firmada de state/nonce. */
export const OAUTH_STATE_COOKIE_NAME = 'eventflow_oauth_state';

export type { OAuthStateNonce };

// SameSite nunca `strict`: el callback llega como navegación top-level desde el dominio de Google;
// con `strict` la cookie no se enviaría. `lax` (o `none`+Secure) sí la envía.
const stateCookie = signedJsonCookie<OAuthStateNonce>({
  name: OAUTH_STATE_COOKIE_NAME,
  maxAgeMs: () => config.OAUTH_STATE_TTL_SECONDS * 1000,
  isValid: (v): v is OAuthStateNonce =>
    typeof (v as OAuthStateNonce | null)?.state === 'string' &&
    typeof (v as OAuthStateNonce | null)?.nonce === 'string',
});

/** Genera `state` + `nonce` aleatorios (256 bits, base64url) de un solo uso. */
export function generateStateNonce(): OAuthStateNonce {
  return {
    state: randomBytes(32).toString('base64url'),
    nonce: randomBytes(32).toString('base64url'),
  };
}

/** Emite la cookie firmada con `{state, nonce}` y su TTL corto. */
export const issueOAuthStateCookie = stateCookie.issue;

/** Lee y parsea la cookie firmada. Devuelve `null` si ausente/alterada/malformada. */
export const readOAuthStateCookie = stateCookie.read;

/** Consume (limpia) la cookie de state/nonce — single-use tras el callback. */
export const clearOAuthStateCookie = stateCookie.clear;

/**
 * Comparación en tiempo constante de dos strings (anti timing en el match del `state`).
 * Longitudes distintas → false inmediato (sin filtrar la longitud real).
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
