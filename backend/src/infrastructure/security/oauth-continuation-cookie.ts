// Cookie de continuación del flujo OAuth (US-008 / BE-003, SEC-05). Cuando el callback no puede
// emitir sesión de inmediato (falta selección de rol o confirmación de vinculación), se persiste
// la continuación en una cookie HTTP-only FIRMADA de corta vida (no en la URL → no queda en logs
// ni es legible por JS). Los endpoints POST de continuación la leen y la consumen (single-use).
// Transporta SOLO `googleSub`/email/rol pendiente — NUNCA el `id_token`.
import type { Request, Response, CookieOptions } from 'express';
import { config } from '../../config/env.js';
import type { OAuthContinuation } from '../../modules/identity-access/application/oauth-flow.types.js';

export const OAUTH_CONTINUATION_COOKIE_NAME = 'eventflow_oauth_continuation';

function isSecure(): boolean {
  return config.SESSION_COOKIE_SECURE ?? config.NODE_ENV === 'production';
}

function continuationCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    signed: true,
    secure: isSecure(),
    // El POST de continuación es same-site (fetch del frontend); `lax` es suficiente y seguro.
    sameSite: config.SESSION_COOKIE_SAMESITE === 'strict' ? 'lax' : config.SESSION_COOKIE_SAMESITE,
    path: '/',
  };
}

export function issueContinuationCookie(res: Response, continuation: OAuthContinuation): void {
  res.cookie(OAUTH_CONTINUATION_COOKIE_NAME, JSON.stringify(continuation), {
    ...continuationCookieOptions(),
    maxAge: config.OAUTH_STATE_TTL_SECONDS * 1000,
  });
}

/** Lee y valida la cookie de continuación firmada. `null` si ausente/alterada/malformada. */
export function readContinuationCookie(req: Request): OAuthContinuation | null {
  const raw = req.signedCookies?.[OAUTH_CONTINUATION_COOKIE_NAME] as unknown;
  if (typeof raw !== 'string' || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw) as OAuthContinuation;
    if (parsed?.action === 'signup') {
      if (typeof parsed.googleSub === 'string' && typeof parsed.email === 'string') return parsed;
      return null;
    }
    if (parsed?.action === 'link') {
      if (
        typeof parsed.userId === 'string' &&
        typeof parsed.googleSub === 'string' &&
        typeof parsed.email === 'string'
      ) {
        return parsed;
      }
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearContinuationCookie(res: Response): void {
  res.clearCookie(OAUTH_CONTINUATION_COOKIE_NAME, continuationCookieOptions());
}
