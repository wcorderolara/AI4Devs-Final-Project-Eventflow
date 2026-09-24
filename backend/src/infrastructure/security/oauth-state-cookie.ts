// Servicio `state` + `nonce` anti-CSRF del flujo OAuth (US-008 / BE-002, SEC-03). Genera valores
// aleatorios criptográficos de un solo uso y los transporta en una cookie HTTP-only FIRMADA de
// corta vida (TTL `OAUTH_STATE_TTL_SECONDS`), en lugar de una tabla server-side (Tech Spec §4
// admite ambas; N-03 del execution record). En el callback: se compara el `state` de la query con
// el de la cookie (anti-CSRF) y se consume la cookie (single-use → anti-replay). El `nonce` se
// verifica contra el claim del `id_token` en el provider.
import { randomBytes } from 'node:crypto';
import type { Request, Response, CookieOptions } from 'express';
import { config } from '../../config/env.js';
import type { OAuthStateNonce } from '../../shared/auth/oauth.js';

/** Nombre de la cookie firmada de state/nonce. */
export const OAUTH_STATE_COOKIE_NAME = 'eventflow_oauth_state';

export type { OAuthStateNonce };

/** `Secure` explícito si se define; si no, se activa fuera de development/test. */
function isSecure(): boolean {
  return config.SESSION_COOKIE_SECURE ?? config.NODE_ENV === 'production';
}

/** Opciones de la cookie de state/nonce (SameSite=Lax permite el retorno del callback top-level GET). */
function stateCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    signed: true,
    secure: isSecure(),
    // Nunca `strict`: el callback llega como navegación top-level desde el dominio de Google; con
    // `strict` la cookie no se enviaría. `lax` (o `none`+Secure) sí la envía. Se degrada a `lax`.
    sameSite: config.SESSION_COOKIE_SAMESITE === 'strict' ? 'lax' : config.SESSION_COOKIE_SAMESITE,
    path: '/',
  };
}

/** Genera `state` + `nonce` aleatorios (256 bits, base64url) de un solo uso. */
export function generateStateNonce(): OAuthStateNonce {
  return {
    state: randomBytes(32).toString('base64url'),
    nonce: randomBytes(32).toString('base64url'),
  };
}

/** Emite la cookie firmada con `{state, nonce}` y su TTL corto. */
export function issueOAuthStateCookie(res: Response, value: OAuthStateNonce): void {
  res.cookie(OAUTH_STATE_COOKIE_NAME, JSON.stringify(value), {
    ...stateCookieOptions(),
    maxAge: config.OAUTH_STATE_TTL_SECONDS * 1000,
  });
}

/** Lee y parsea la cookie firmada. Devuelve `null` si ausente/alterada/malformada. */
export function readOAuthStateCookie(req: Request): OAuthStateNonce | null {
  const raw = req.signedCookies?.[OAUTH_STATE_COOKIE_NAME] as unknown;
  if (typeof raw !== 'string' || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw) as OAuthStateNonce;
    if (typeof parsed?.state !== 'string' || typeof parsed?.nonce !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Consume (limpia) la cookie de state/nonce — single-use tras el callback. */
export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, stateCookieOptions());
}

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
