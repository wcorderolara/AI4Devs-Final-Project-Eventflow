// Cookie de continuación del flujo OAuth (US-008 / BE-003, SEC-05). Cuando el callback no puede
// emitir sesión de inmediato (falta selección de rol o confirmación de vinculación), se persiste
// la continuación en una cookie HTTP-only FIRMADA de corta vida (no en la URL → no queda en logs
// ni es legible por JS). Los endpoints POST de continuación la leen y la consumen (single-use).
// Transporta SOLO `googleSub`/email/rol pendiente — NUNCA el `id_token`.
import { config } from '../../config/env.js';
import type { OAuthContinuation } from '../../modules/identity-access/application/oauth-flow.types.js';
import { signedJsonCookie } from './cookie-codec.js';

export const OAUTH_CONTINUATION_COOKIE_NAME = 'eventflow_oauth_continuation';

function isContinuation(value: unknown): value is OAuthContinuation {
  const c = value as Partial<Record<'action' | 'userId' | 'googleSub' | 'email', unknown>> | null;
  if (c?.action === 'signup') return typeof c.googleSub === 'string' && typeof c.email === 'string';
  if (c?.action === 'link') {
    return typeof c.userId === 'string' && typeof c.googleSub === 'string' && typeof c.email === 'string';
  }
  return false;
}

// El POST de continuación es same-site (fetch del frontend); `lax` es suficiente y seguro.
const continuationCookie = signedJsonCookie<OAuthContinuation>({
  name: OAUTH_CONTINUATION_COOKIE_NAME,
  maxAgeMs: () => config.OAUTH_STATE_TTL_SECONDS * 1000,
  isValid: isContinuation,
});

export const issueContinuationCookie = continuationCookie.issue;

/** Lee y valida la cookie de continuación firmada. `null` si ausente/alterada/malformada. */
export const readContinuationCookie = continuationCookie.read;

export const clearContinuationCookie = continuationCookie.clear;
