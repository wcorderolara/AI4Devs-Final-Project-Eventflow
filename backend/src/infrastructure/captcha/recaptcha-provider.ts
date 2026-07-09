// RecaptchaProvider (US-109 / BE-004). ADR-SEC-004; AC-06, EC-03/04/05.
// Verifica un token contra la API de siteverify de reCAPTCHA v3 con secret backend. Valida
// success, action (si `expectedAction`) y score (umbral configurable). Normaliza fallos a
// `CaptchaOutcome`. El secret y el token nunca se loguean ni se persisten (SEC-02/SEC-03).
import type {
  CaptchaVerifier,
  CaptchaVerificationInput,
  CaptchaVerificationResult,
  CaptchaOutcome,
} from '../../shared/security/captcha/captcha-verifier.port.js';
import { config } from '../../config/env.js';
import { postSiteverify, type FetchLike } from './siteverify-client.js';

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
/** `error-codes` de reCAPTCHA que representan token expirado/duplicado (no simple invalidez). */
const EXPIRED_DUP_CODES = new Set(['timeout-or-duplicate']);

export class RecaptchaProvider implements CaptchaVerifier {
  readonly provider = 'recaptcha' as const;

  constructor(private readonly fetchFn: FetchLike = fetch) {}

  async verify(input: CaptchaVerificationInput): Promise<CaptchaVerificationResult> {
    const params: Record<string, string> = {
      secret: config.RECAPTCHA_SECRET_KEY ?? '',
      response: input.token,
    };
    if (input.remoteIp) params.remoteip = input.remoteIp;

    const result = await postSiteverify(
      RECAPTCHA_VERIFY_URL,
      params,
      config.CAPTCHA_VERIFY_TIMEOUT_MS,
      this.fetchFn,
    );
    if (!result.ok) return this.fail(result.reason);

    const { success, score, action } = result.data;
    if (!success) {
      const codes = result.data['error-codes'] ?? [];
      const expired = codes.some((c) => EXPIRED_DUP_CODES.has(c));
      return this.fail(expired ? 'expired_or_duplicate' : 'invalid_token');
    }
    // Action mismatch (VR-07): sólo si el proveedor devolvió action y se esperaba una concreta.
    const actionMatched =
      input.expectedAction === undefined || action === undefined || action === input.expectedAction;
    if (!actionMatched) return { ...this.fail('action_mismatch'), score, actionMatched: false };
    // Score bajo (VR-08): sólo si reCAPTCHA v3 entregó score.
    if (typeof score === 'number' && score < config.CAPTCHA_SCORE_THRESHOLD) {
      return { ...this.fail('score_too_low'), score, actionMatched: true };
    }
    return { success: true, provider: this.provider, outcome: 'success', actionMatched: true, score };
  }

  private fail(outcome: CaptchaOutcome): CaptchaVerificationResult {
    return { success: false, provider: this.provider, outcome };
  }
}
