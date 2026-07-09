// HcaptchaProvider (US-109 / BE-005). ADR-SEC-004; AC-06, EC-05.
// Verifica un token contra la API de siteverify de hCaptcha con secret backend. hCaptcha clásico
// no expone score por default; se valida `success` y (si el proveedor lo devuelve) la coincidencia
// de acción. Normaliza fallos a `CaptchaOutcome`. Secret/token nunca se loguean (SEC-02/SEC-03).
import type {
  CaptchaVerifier,
  CaptchaVerificationInput,
  CaptchaVerificationResult,
  CaptchaOutcome,
} from '../../shared/security/captcha/captcha-verifier.port.js';
import { config } from '../../config/env.js';
import { postSiteverify, type FetchLike } from './siteverify-client.js';

const HCAPTCHA_VERIFY_URL = 'https://api.hcaptcha.com/siteverify';
const EXPIRED_DUP_CODES = new Set(['expired-input-response', 'already-seen-response']);

export class HcaptchaProvider implements CaptchaVerifier {
  readonly provider = 'hcaptcha' as const;

  constructor(private readonly fetchFn: FetchLike = fetch) {}

  async verify(input: CaptchaVerificationInput): Promise<CaptchaVerificationResult> {
    const params: Record<string, string> = {
      secret: config.HCAPTCHA_SECRET_KEY ?? '',
      response: input.token,
    };
    if (input.remoteIp) params.remoteip = input.remoteIp;

    const result = await postSiteverify(
      HCAPTCHA_VERIFY_URL,
      params,
      config.CAPTCHA_VERIFY_TIMEOUT_MS,
      this.fetchFn,
    );
    if (!result.ok) return this.fail(result.reason);

    const { success, action } = result.data;
    if (!success) {
      const codes = result.data['error-codes'] ?? [];
      const expired = codes.some((c) => EXPIRED_DUP_CODES.has(c));
      return this.fail(expired ? 'expired_or_duplicate' : 'invalid_token');
    }
    const actionMatched =
      input.expectedAction === undefined || action === undefined || action === input.expectedAction;
    if (!actionMatched) return { ...this.fail('action_mismatch'), actionMatched: false };
    return { success: true, provider: this.provider, outcome: 'success', actionMatched: true };
  }

  private fail(outcome: CaptchaOutcome): CaptchaVerificationResult {
    return { success: false, provider: this.provider, outcome };
  }
}
