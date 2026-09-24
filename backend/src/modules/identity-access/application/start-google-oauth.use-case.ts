// StartGoogleOAuthUseCase (US-008 / BE-003, AUTH-TS-01). Genera `state`+`nonce` de un solo uso y
// construye la URL de autorización de Google. El controller emite la cookie firmada de state/nonce
// y responde 302 a `authorizationUrl`. El guard solo-anónimo (AUTH-TS-02) se aplica antes en la ruta.
import type { OAuthProvider, OAuthStateNonce } from '../../../shared/auth/oauth.js';

export interface StartGoogleOAuthResult {
  authorizationUrl: string;
  stateNonce: OAuthStateNonce;
}

export class StartGoogleOAuthUseCase {
  constructor(
    private readonly provider: OAuthProvider,
    private readonly generateStateNonce: () => OAuthStateNonce,
  ) {}

  execute(): StartGoogleOAuthResult {
    const stateNonce = this.generateStateNonce();
    const authorizationUrl = this.provider.buildAuthorizationUrl(stateNonce);
    return { authorizationUrl, stateNonce };
  }
}
