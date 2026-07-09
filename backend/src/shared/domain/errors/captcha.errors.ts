// Errores de captcha (US-109 / BE-006). ADR-SEC-004; AC-05, VR-01/VR-02, EC-01/EC-02.
// Ambos mapean a HTTP 400 con código estable. Mensajes GENÉRICOS: no revelan validez de
// credenciales, existencia de email, score ni detalles del proveedor (SEC-07).
import { AppError } from './app.error.js';

/** Token de captcha ausente → 400 CAPTCHA_REQUIRED (EC-01, VR-01). */
export class CaptchaRequiredError extends AppError {
  readonly code = 'CAPTCHA_REQUIRED';

  constructor(message = 'Captcha verification is required.') {
    super(message);
  }
}

/** Token inválido/expirado/action mismatch/score bajo/provider error → 400 CAPTCHA_INVALID (EC-02, VR-02). */
export class CaptchaInvalidError extends AppError {
  readonly code = 'CAPTCHA_INVALID';

  constructor(message = 'Security verification failed. Please try again.') {
    super(message);
  }
}
