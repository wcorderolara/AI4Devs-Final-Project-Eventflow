// Adapter — Cookie de sesión HTTP-only firmada (US-094 / SEC-001; US-108 / BE-002). ADR-SEC-002.
// La cookie transporta el `sid` opaco, FIRMADO con `SESSION_SECRET` (cookie-parser). Atributos:
// HttpOnly, Signed, `SameSite` por entorno (default `Lax`), `Path=/`, `Secure` fuera de
// desarrollo local. El valor del sid nunca se retorna en el JSON de respuesta (SEC-03) ni se
// loguea (SEC-07).
import type { Response, CookieOptions } from 'express';
import { config } from '../../config/env.js';

export const SESSION_COOKIE_NAME: string = config.SESSION_COOKIE_NAME;

/** Vigencia de la cookie/sesión en milisegundos (US-108: `SESSION_COOKIE_MAX_AGE_DAYS`, default 30). */
export const SESSION_MAX_AGE_MS: number = config.SESSION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

/** `Secure` explícito si se define; si no, se activa fuera de development/test. */
function isSecure(): boolean {
  return config.SESSION_COOKIE_SECURE ?? config.NODE_ENV === 'production';
}

/** Opciones base de la cookie de sesión (sin `maxAge`, común a set/clear). */
export function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    signed: true,
    secure: isSecure(),
    sameSite: config.SESSION_COOKIE_SAMESITE, // 'lax' | 'none' | 'strict' (validado en boot)
    path: '/',
  };
}

/** Emite la cookie de sesión con el `sid` firmado y su vigencia (`SESSION_COOKIE_MAX_AGE_DAYS`). */
export function issueSessionCookie(res: Response, sessionId: string): void {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    ...baseCookieOptions(),
    maxAge: SESSION_MAX_AGE_MS,
  });
}

/** Limpia la cookie de sesión (logout). Mismos atributos de path/secure para invalidarla. */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, baseCookieOptions());
}

// Cookie UX `eventflow_role` (US-105 FE consumer). Claim NO firmado y NO HttpOnly: el middleware
// de Next.js la lee para el role guard de routing. El backend sigue siendo la única fuente de
// autoridad (valida cada request); esta cookie es solo un hint UX para evitar flashes de contenido.
export const ROLE_COOKIE_NAME = 'eventflow_role';

function roleCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    signed: false,
    secure: isSecure(),
    sameSite: config.SESSION_COOKIE_SAMESITE,
    path: '/',
  };
}

export function issueRoleCookie(res: Response, role: string): void {
  res.cookie(ROLE_COOKIE_NAME, role, {
    ...roleCookieOptions(),
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export function clearRoleCookie(res: Response): void {
  res.clearCookie(ROLE_COOKIE_NAME, roleCookieOptions());
}
