// MockCaptchaProvider (US-109 / BE-003). ADR-SEC-004; AC-05. Determinista para Local/CI.
// Acepta ÚNICAMENTE el token '__test__'; cualquier otro valor (vacío, distinto) → invalid_token.
// Nunca hace llamadas de red. El ban de `mock` fuera de Local/CI se aplica en boot (config).
import type {
  CaptchaVerifier,
  CaptchaVerificationInput,
  CaptchaVerificationResult,
} from '../../shared/security/captcha/captcha-verifier.port.js';

export const MOCK_CAPTCHA_TOKEN = '__test__';

export class MockCaptchaProvider implements CaptchaVerifier {
  readonly provider = 'mock' as const;

  verify(input: CaptchaVerificationInput): Promise<CaptchaVerificationResult> {
    const success = input.token === MOCK_CAPTCHA_TOKEN;
    return Promise.resolve({
      success,
      provider: this.provider,
      outcome: success ? 'success' : 'invalid_token',
      actionMatched: success,
    });
  }
}
