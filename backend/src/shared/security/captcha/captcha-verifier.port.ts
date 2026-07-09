// Puerto CaptchaVerifier (US-109 / BE-002). ADR-SEC-004; Clean/Hexagonal.
// Abstracción de verificación de captcha server-side. Los use cases/middleware dependen de este
// puerto; los adapters concretos (mock, reCAPTCHA, hCaptcha) viven en `infrastructure/captcha` y
// se seleccionan por `CAPTCHA_PROVIDER`. El resultado es opaco al cliente: `outcome`/`score`/
// `failureReason` son metadatos internos para logs y decisión, NUNCA se exponen en la respuesta.

export type CaptchaProviderName = 'mock' | 'recaptcha' | 'hcaptcha';

/** Acción esperada por endpoint (VR-07). Se compara contra la acción del token cuando aplica. */
export type CaptchaAction = 'register' | 'login' | 'password_reset_request';

/** Resultado interno de verificación (no expuesto al cliente). `success=false` → 400 CAPTCHA_INVALID. */
export type CaptchaOutcome =
  | 'success'
  | 'invalid_token'
  | 'expired_or_duplicate'
  | 'action_mismatch'
  | 'score_too_low'
  | 'provider_timeout'
  | 'provider_error';

export interface CaptchaVerificationInput {
  /** Token emitido por el widget frontend. Nunca se loguea ni se persiste (SEC-03). */
  token: string;
  /** Acción esperada según el endpoint; el provider la valida si la soporta. */
  expectedAction?: CaptchaAction;
  /** IP del cliente, opcional, si se decide enviar al proveedor. */
  remoteIp?: string;
}

export interface CaptchaVerificationResult {
  success: boolean;
  provider: CaptchaProviderName;
  outcome: CaptchaOutcome;
  /** Sólo para decisión/log interno; no se expone. */
  actionMatched?: boolean;
  score?: number;
}

/** Puerto: verifica un token de captcha server-side. */
export interface CaptchaVerifier {
  readonly provider: CaptchaProviderName;
  verify(input: CaptchaVerificationInput): Promise<CaptchaVerificationResult>;
}
