// CaptchaProviderFactory (US-109 / BE-002). ADR-SEC-004; AC-04.
// Selecciona el `CaptchaVerifier` según `config.CAPTCHA_PROVIDER` EN CADA verificación (no en
// construcción): así la selección refleja siempre la config vigente y respeta tests que mutan el
// provider en runtime. Los tres adapters se instancian una vez (los reales sólo hacen red al
// invocar `verify`, lo que sólo ocurre cuando el provider está seleccionado).
import type { CaptchaVerifier, CaptchaProviderName } from '../../shared/security/captcha/captcha-verifier.port.js';
import { config } from '../../config/env.js';
import { MockCaptchaProvider } from './mock-captcha-provider.js';
import { RecaptchaProvider } from './recaptcha-provider.js';
import { HcaptchaProvider } from './hcaptcha-provider.js';

export class CaptchaProviderFactory {
  private readonly providers: Record<CaptchaProviderName, CaptchaVerifier>;

  constructor(providers?: Partial<Record<CaptchaProviderName, CaptchaVerifier>>) {
    this.providers = {
      mock: providers?.mock ?? new MockCaptchaProvider(),
      recaptcha: providers?.recaptcha ?? new RecaptchaProvider(),
      hcaptcha: providers?.hcaptcha ?? new HcaptchaProvider(),
    };
  }

  /** Resuelve el verifier del provider configurado en este momento. */
  resolve(): CaptchaVerifier {
    return this.providers[config.CAPTCHA_PROVIDER];
  }
}

/** Singleton de composición reutilizado por el middleware (mismo patrón que `auth-composition`). */
export const captchaProviderFactory = new CaptchaProviderFactory();
