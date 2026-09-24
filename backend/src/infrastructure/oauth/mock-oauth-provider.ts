// Adapter — `MockOAuthProvider` determinista (US-008 / BE-001, QA-001/QA-002). Implementa el
// puerto `OAuthProvider` sin red: el `code` es un token sintético (base64url JSON) que transporta
// la identidad simulada + `nonce` + un escenario de fallo opcional. Habilita tests de integración
// (Supertest) y E2E (Playwright) con un flujo OAuth completamente controlado. NUNCA se usa en
// producción (la factory solo lo instancia cuando `GOOGLE_OAUTH_ENABLED=false` o en test).
import type { OAuthProvider, VerifiedGoogleIdentity, BuildAuthorizationUrlParams } from '../../shared/auth/oauth.js';
import { OAuthVerificationError } from '../../shared/domain/errors/oauth.errors.js';

/** Escenarios de fallo simulables por los tests negativos (NT-01/NT-03). */
export type MockOAuthFailure = 'expired' | 'email_not_verified' | 'invalid';

/** Carga transportada por el `code` sintético del mock. */
export interface MockOAuthCodePayload {
  identity: VerifiedGoogleIdentity;
  nonce: string;
  fail?: MockOAuthFailure;
}

/** Codifica una carga como `code` sintético (base64url) — usado por tests y por `buildAuthorizationUrl`. */
export function encodeMockOAuthCode(payload: MockOAuthCodePayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/** Decodifica un `code` sintético. Devuelve `null` si no es un mock code válido. */
export function decodeMockOAuthCode(code: string): MockOAuthCodePayload | null {
  try {
    const json = Buffer.from(code, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as MockOAuthCodePayload;
    if (!parsed?.identity?.sub || !parsed?.identity?.email || typeof parsed.nonce !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export interface MockOAuthProviderConfig {
  /** URI del callback backend (para `buildAuthorizationUrl`). */
  redirectUri: string;
  /** Identidad por defecto usada por `buildAuthorizationUrl` (flujo E2E). */
  defaultIdentity: VerifiedGoogleIdentity;
}

export class MockOAuthProvider implements OAuthProvider {
  constructor(private readonly cfg: MockOAuthProviderConfig) {}

  buildAuthorizationUrl({ state, nonce }: BuildAuthorizationUrlParams): string {
    // En vez de ir a Google, redirige directo al callback con un `code` sintético autocontenido.
    const code = encodeMockOAuthCode({ identity: this.cfg.defaultIdentity, nonce });
    const url = new URL(this.cfg.redirectUri);
    url.searchParams.set('code', code);
    url.searchParams.set('state', state);
    return url.toString();
  }

  exchangeCode(code: string): Promise<{ idToken: string }> {
    // El `code` sintético ES el `id_token` simulado (pass-through).
    return Promise.resolve({ idToken: code });
  }

  verifyIdToken(
    idToken: string,
    { expectedNonce }: { expectedNonce: string },
  ): Promise<VerifiedGoogleIdentity> {
    const payload = decodeMockOAuthCode(idToken);
    if (!payload) throw new OAuthVerificationError('id_token_malformed');
    if (payload.fail === 'expired') throw new OAuthVerificationError('id_token_expired');
    if (payload.fail === 'email_not_verified') throw new OAuthVerificationError('email_not_verified');
    if (payload.fail === 'invalid') throw new OAuthVerificationError('id_token_invalid');
    // Verificación real de `nonce` (anti-replay) incluso en el mock (SEC-03).
    if (payload.nonce !== expectedNonce) throw new OAuthVerificationError('nonce_mismatch');
    return Promise.resolve({ ...payload.identity, emailVerified: true });
  }
}
