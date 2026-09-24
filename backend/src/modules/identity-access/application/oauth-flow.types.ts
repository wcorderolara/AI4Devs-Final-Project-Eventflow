// Tipos del flujo OAuth Google (US-008 / BE-003). El callback resuelve uno de tres caminos:
// login (sesión inmediata), signup_required (falta seleccionar rol) o link_required (falta
// confirmar vinculación a una cuenta email/password existente). Las "continuaciones" transportan
// SOLO lo mínimo para completar el paso interactivo; NUNCA el `id_token` (SEC-05).
import type { AuthUser } from '../../../shared/auth/types.js';

/** Continuación de signup: crear cuenta nueva tras elegir rol (AC-02). */
export interface SignupContinuation {
  action: 'signup';
  googleSub: string;
  email: string;
  name?: string;
}

/** Continuación de vinculación: confirmar link a una cuenta existente (AC-03). */
export interface LinkContinuation {
  action: 'link';
  userId: string;
  googleSub: string;
  email: string;
}

export type OAuthContinuation = SignupContinuation | LinkContinuation;

/** Resultado del `HandleGoogleCallbackUseCase`. */
export type CallbackOutcome =
  | { kind: 'login'; user: AuthUser; sessionId: string }
  | { kind: 'signup_required'; continuation: SignupContinuation }
  | { kind: 'link_required'; continuation: LinkContinuation };

/** Resultado de completar signup o confirmar vinculación (sesión emitida). */
export interface OAuthSessionResult {
  user: AuthUser;
  sessionId: string;
}
