// Adapter — `GoogleOAuthProvider` (US-008 / BE-001). Implementa el puerto `OAuthProvider` para
// Google (OIDC Authorization Code flow). Verifica el `id_token` con RS256 usando `jsonwebtoken`
// (ya presente) + JWK públicas de Google convertidas a `KeyObject` con `node:crypto` — SIN agregar
// dependencias nuevas (N-02 del execution record). Valida `aud`/`iss`/`exp` (jsonwebtoken) y, de
// forma explícita, `nonce` y `email_verified` (SEC-01/SEC-02, VR-01/VR-02, EC-01). El `id_token`
// NUNCA se loguea ni se expone fuera de esta capa (SEC-05).
import jwt from 'jsonwebtoken';
import type { OAuthProvider, VerifiedGoogleIdentity, BuildAuthorizationUrlParams } from '../../shared/auth/oauth.js';
import { OAuthVerificationError } from '../../shared/domain/errors/oauth.errors.js';
import type { FetchLike } from '../captcha/siteverify-client.js';
import type { JwksProvider } from './jwks.js';

/** Endpoints/constantes públicas del proveedor Google (no configurables). */
export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
/** Emisores aceptados del `id_token` (Google publica ambas formas). */
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export interface GoogleOAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Timeout (ms) para el intercambio de `code` por tokens. */
  tokenExchangeTimeoutMs?: number;
}

/** Forma parcial de la respuesta del token endpoint de Google. */
interface GoogleTokenResponse {
  id_token?: string;
}

/** Claims relevantes del `id_token` de Google (OIDC). */
interface GoogleIdTokenClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  nonce?: string;
}

export class GoogleOAuthProvider implements OAuthProvider {
  private readonly timeoutMs: number;

  constructor(
    private readonly cfg: GoogleOAuthProviderConfig,
    private readonly jwks: JwksProvider,
    private readonly fetchFn: FetchLike = fetch,
  ) {
    this.timeoutMs = cfg.tokenExchangeTimeoutMs ?? 5000;
  }

  buildAuthorizationUrl({ state, nonce }: BuildAuthorizationUrlParams): string {
    const params = new URLSearchParams({
      client_id: this.cfg.clientId,
      redirect_uri: this.cfg.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      // Fuerza selección de cuenta; sin refresh tokens (no accedemos a APIs de Google).
      prompt: 'select_account',
    });
    return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<{ idToken: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchFn(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.cfg.clientId,
          client_secret: this.cfg.clientSecret,
          redirect_uri: this.cfg.redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
        signal: controller.signal,
      });
      if (!res.ok) throw new OAuthVerificationError('code_exchange_failed');
      const data = (await res.json()) as GoogleTokenResponse;
      if (!data.id_token) throw new OAuthVerificationError('id_token_missing');
      return { idToken: data.id_token };
    } catch (err) {
      if (err instanceof OAuthVerificationError) throw err;
      const aborted = err instanceof Error && err.name === 'AbortError';
      throw new OAuthVerificationError(aborted ? 'code_exchange_timeout' : 'code_exchange_error');
    } finally {
      clearTimeout(timer);
    }
  }

  async verifyIdToken(
    idToken: string,
    { expectedNonce }: { expectedNonce: string },
  ): Promise<VerifiedGoogleIdentity> {
    // 1. Header → `kid` + `alg` (solo RS256, mitigación de `alg=none`/HS256 confusion).
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string') throw new OAuthVerificationError('id_token_malformed');
    const { kid, alg } = decoded.header;
    if (alg !== 'RS256') throw new OAuthVerificationError('unexpected_alg');
    if (!kid) throw new OAuthVerificationError('missing_kid');

    // 2. JWK por `kid` (refresca una vez ante `kid` desconocido — rotación de Google).
    let key = await this.jwks.getKey(kid);
    if (!key) key = await this.jwks.getKey(kid, true);
    if (!key) throw new OAuthVerificationError('unknown_kid');

    // 3. Verificación de firma + `aud`/`iss`/`exp` (jsonwebtoken).
    let claims: GoogleIdTokenClaims;
    try {
      claims = jwt.verify(idToken, key, {
        algorithms: ['RS256'],
        audience: this.cfg.clientId,
        issuer: GOOGLE_ISSUERS as [string, ...string[]],
      }) as GoogleIdTokenClaims;
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'TokenExpiredError') throw new OAuthVerificationError('id_token_expired');
      throw new OAuthVerificationError('id_token_invalid');
    }

    // 4. `nonce` de un solo uso (anti-replay, SEC-03): debe coincidir con el emitido.
    if (!claims.nonce || claims.nonce !== expectedNonce) {
      throw new OAuthVerificationError('nonce_mismatch');
    }

    // 5. `email_verified=true` (VR-02, EC-01). Google puede enviar boolean o el string 'true'.
    const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
    if (!emailVerified) throw new OAuthVerificationError('email_not_verified');

    if (!claims.sub || !claims.email) throw new OAuthVerificationError('id_token_incomplete');

    return {
      sub: claims.sub,
      email: claims.email.toLowerCase(),
      emailVerified: true,
      name: claims.name,
    };
  }
}
