// Adapter — Cookie de sesión HTTP-only firmada (US-094 / SEC-001). ADR-SEC-002.
// La cookie transporta el `sid` opaco, FIRMADO con `SESSION_SECRET` (cookie-parser). Atributos:
// HttpOnly, Signed, `SameSite=Lax`, `Path=/`, `Secure` fuera de desarrollo local. El valor del
// sid nunca se retorna en el JSON de respuesta (SEC-03) ni se loguea (SEC-07).
import type { Response, CookieOptions } from 'express';
import { config } from '../../config/env.js';

export const SESSION_COOKIE_NAME: string = config.SESSION_COOKIE_NAME;

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
    sameSite: 'lax',
    path: '/',
  };
}

/** Emite la cookie de sesión con el `sid` firmado y su vigencia (`SESSION_TTL_HOURS`). */
export function issueSessionCookie(res: Response, sessionId: string): void {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    ...baseCookieOptions(),
    maxAge: config.SESSION_TTL_HOURS * 60 * 60 * 1000,
  });
}

/** Limpia la cookie de sesión (logout). Mismos atributos de path/secure para invalidarla. */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, baseCookieOptions());
}
