// Codec común de las cookies de auth (US-094 sesión, US-105 rol, US-008 OAuth state/continuación).
// Centraliza `Secure` por entorno, `SameSite`, `Path=/` y el transporte JSON firmado; cada cookie
// conserva su nombre, flags y `maxAge`.
import type { Request, Response, CookieOptions } from 'express';
import { config } from '../../config/env.js';

/** `Secure` explícito si se define; si no, se activa fuera de development/test. */
function isSecure(): boolean {
  return config.SESSION_COOKIE_SECURE ?? config.NODE_ENV === 'production';
}

export interface CookieFlags {
  httpOnly: boolean;
  signed: boolean;
  /** Degrada `strict` a `lax`: el retorno OAuth es una navegación top-level cross-site. */
  relaxStrictSameSite?: boolean;
}

export function cookieOptions({ httpOnly, signed, relaxStrictSameSite }: CookieFlags): CookieOptions {
  const sameSite = config.SESSION_COOKIE_SAMESITE; // 'lax' | 'none' | 'strict' (validado en boot)
  return {
    httpOnly,
    signed,
    secure: isSecure(),
    sameSite: relaxStrictSameSite && sameSite === 'strict' ? 'lax' : sameSite,
    path: '/',
  };
}

export interface JsonCookie<T> {
  issue(res: Response, value: T): void;
  /** `null` si la cookie está ausente, alterada (firma) o malformada. */
  read(req: Request): T | null;
  clear(res: Response): void;
}

/** Cookie HTTP-only firmada de corta vida que transporta un JSON validado al leer. */
export function signedJsonCookie<T>(spec: {
  name: string;
  maxAgeMs: () => number;
  isValid: (value: unknown) => value is T;
}): JsonCookie<T> {
  const options = (): CookieOptions =>
    cookieOptions({ httpOnly: true, signed: true, relaxStrictSameSite: true });
  return {
    issue(res, value) {
      res.cookie(spec.name, JSON.stringify(value), { ...options(), maxAge: spec.maxAgeMs() });
    },
    read(req) {
      const raw = req.signedCookies?.[spec.name] as unknown;
      if (typeof raw !== 'string' || raw.length === 0) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        return spec.isValid(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    clear(res) {
      res.clearCookie(spec.name, options());
    },
  };
}
