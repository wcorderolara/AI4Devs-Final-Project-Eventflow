// Eventos técnicos de captcha (US-109 / OBS-001). AC-07; §14 Observability & Audit.
// Emite eventos estructurados de verificación con metadatos SEGUROS: correlationId, endpoint,
// provider, outcome, expectedAction, env. NUNCA incluye `captchaToken`, secret, raw provider
// response, password, cookie ni email (el logger central además aplica redacción).
import type { CaptchaProviderName, CaptchaOutcome } from '../../shared/security/captcha/captcha-verifier.port.js';
import { createEventLogger } from './event-logger.js';

export type CaptchaEventName =
  | 'captcha.verify.succeeded'
  | 'captcha.verify.failed'
  | 'captcha.provider.timeout'
  | 'captcha.config.invalid';

export interface CaptchaEventData {
  correlationId?: string;
  endpoint?: string;
  provider?: CaptchaProviderName;
  outcome?: CaptchaOutcome | 'missing_token' | 'config_invalid';
  expectedAction?: string;
  env?: string;
}

/** Registra un evento de captcha. `succeeded` a `info`; el resto a `warn`. */
export const logCaptchaEvent = createEventLogger<CaptchaEventName, CaptchaEventData>({
  level: (event) => (event === 'captcha.verify.succeeded' ? 'info' : 'warn'),
});
