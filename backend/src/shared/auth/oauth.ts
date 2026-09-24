// Puerto (interfaz) del proveedor OAuth/OIDC y tipos asociados (US-008 / BE-001). Clean/Hexagonal:
// el caso de uso `HandleGoogleCallbackUseCase` depende de esta abstracción; el adapter concreto
// (`GoogleOAuthProvider`) vive en `src/infrastructure/oauth` y un `MockOAuthProvider` determinista
// habilita tests sin red (paralelo conceptual a `LLMProvider`). El `id_token` NUNCA se expone
// fuera de esta capa (SEC-05): el puerto devuelve solo la identidad verificada mínima.

/** Identidad verificada de Google tras validar firma + claims del `id_token` (SEC-01/SEC-02). */
export interface VerifiedGoogleIdentity {
  /** `sub` OIDC: identificador estable del usuario en Google (se persiste como `google_sub`). */
  sub: string;
  /** Email verificado por Google (normalizado a lowercase por el proveedor). */
  email: string;
  /** Siempre `true` cuando la verificación pasa (email_verified=false → error, EC-01). */
  emailVerified: boolean;
  /** Nombre para mostrar (claim `name`), si Google lo provee. */
  name?: string;
}

/** Par `state`+`nonce` anti-CSRF de un solo uso (SEC-03). */
export interface OAuthStateNonce {
  state: string;
  nonce: string;
}

/** Parámetros para construir la URL de autorización de Google (state+nonce anti-CSRF). */
export type BuildAuthorizationUrlParams = OAuthStateNonce;

/**
 * Puerto OAuth/OIDC (Authorization Code flow). Tres operaciones separadas para permitir un mock
 * determinista y tests unitarios de la verificación con JWK mockeadas:
 * - `buildAuthorizationUrl`: arma la URL de consentimiento de Google.
 * - `exchangeCode`: intercambia el `code` del callback por el `id_token` (red al token endpoint).
 * - `verifyIdToken`: verifica firma (JWK) + `aud`/`iss`/`exp`/`nonce`/`email_verified`.
 */
export interface OAuthProvider {
  buildAuthorizationUrl(params: BuildAuthorizationUrlParams): string;
  /** Intercambia el `authorization code` por el `id_token`. Lanza `OAuthVerificationError` si falla. */
  exchangeCode(code: string): Promise<{ idToken: string }>;
  /**
   * Verifica el `id_token` (firma RS256 con JWK del proveedor + `aud`/`iss`/`exp`), comprueba que
   * `nonce` coincide con `expectedNonce` y que `email_verified=true`. Devuelve la identidad
   * verificada. Lanza `OAuthVerificationError` (código neutro) ante cualquier fallo.
   */
  verifyIdToken(idToken: string, params: { expectedNonce: string }): Promise<VerifiedGoogleIdentity>;
}
