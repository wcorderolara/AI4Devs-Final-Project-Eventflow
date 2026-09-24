// Factory del `OAuthProvider` (US-008 / BE-001). Selecciona el adapter según configuración:
// - `GOOGLE_OAUTH_ENABLED=true`  → `GoogleOAuthProvider` real (credenciales validadas en boot).
// - `GOOGLE_OAUTH_ENABLED=false` → `MockOAuthProvider` determinista (Local/CI/Demo/E2E).
// Defensa en profundidad: el mock NUNCA se instancia en producción (fail-fast); el gate de montaje
// de rutas (`isGoogleOAuthRoutable`) impide que el flujo mock quede expuesto en prod.
import { config } from '../../config/env.js';
import type { OAuthProvider, VerifiedGoogleIdentity } from '../../shared/auth/oauth.js';
import { GoogleOAuthProvider } from './google-oauth-provider.js';
import { GoogleJwksProvider } from './jwks.js';
import { MockOAuthProvider } from './mock-oauth-provider.js';

/** Redirect URI efectiva del callback backend (default local si el flag está apagado). */
export function resolveRedirectUri(): string {
  return config.GOOGLE_OAUTH_REDIRECT_URI ?? `http://localhost:${config.PORT}/api/v1/auth/google/callback`;
}

/** Identidad demo por defecto del mock (flujo E2E de login/signup). No es un dato productivo. */
export const MOCK_DEFAULT_IDENTITY: VerifiedGoogleIdentity = {
  sub: 'mock-google-sub-demo',
  email: 'demo.google@seed.eventflow.test',
  emailVerified: true,
  name: 'Demo Google',
};

/**
 * `true` si los endpoints `/auth/google*` deben montarse: cuando el flujo real está habilitado, o
 * en cualquier entorno no-productivo (donde el mock es seguro para demo/E2E). En producción con el
 * flag apagado, las rutas NO se montan (404 natural).
 */
export function isGoogleOAuthRoutable(): boolean {
  return config.GOOGLE_OAUTH_ENABLED || config.NODE_ENV !== 'production';
}

export function createOAuthProvider(): OAuthProvider {
  if (config.GOOGLE_OAUTH_ENABLED) {
    return new GoogleOAuthProvider(
      {
        clientId: config.GOOGLE_OAUTH_CLIENT_ID!,
        clientSecret: config.GOOGLE_OAUTH_CLIENT_SECRET!,
        redirectUri: config.GOOGLE_OAUTH_REDIRECT_URI!,
      },
      new GoogleJwksProvider(),
    );
  }
  // Defensa en profundidad: jamás un provider mock en producción.
  if (config.NODE_ENV === 'production') {
    throw new Error('MockOAuthProvider no permitido en producción: habilita GOOGLE_OAUTH_ENABLED.');
  }
  return new MockOAuthProvider({ redirectUri: resolveRedirectUri(), defaultIdentity: MOCK_DEFAULT_IDENTITY });
}
