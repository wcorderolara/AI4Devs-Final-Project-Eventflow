// conditionalCaptchaMiddleware (US-003 / BE-005, EC-02). Decisión PO US-003 #1/#2: en
// `/auth/login` el captcha NO se exige en los primeros intentos; a partir de N=3 fallos
// consecutivos por IP+email candidato (ventana 10 min) el request DEBE traer `captchaToken`
// válido. Antes del umbral, cualquier token entrante se IGNORA (no se llama al proveedor).
// La verificación real delega en `captchaVerificationMiddleware` (US-109): mismos códigos
// estables `CAPTCHA_REQUIRED`/`CAPTCHA_INVALID` y mismos guards de seguridad.
// No se ubica en `shared/interface/middlewares/` (invariante estructural US-090).
import type { RequestHandler } from 'express';
import type { AuthAttemptTracker } from '../../security/auth-attempts/auth-attempt-tracker.port.js';
import { captchaVerificationMiddleware } from '../middlewares/captcha-verification.middleware.js';

/** Extrae el email candidato del body (pre-validado por Zod en el orden de la cadena). */
function emailFrom(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'email' in body) {
    const email = (body as { email?: unknown }).email;
    if (typeof email === 'string') return email;
  }
  return '';
}

export function createConditionalCaptchaMiddleware(deps: {
  attempts: AuthAttemptTracker;
}): RequestHandler {
  return (req, res, next): void => {
    const email = emailFrom(req.body);
    const ip = req.ip ?? 'unknown';
    if (!deps.attempts.isCaptchaRequired(ip, email)) {
      next();
      return;
    }
    // Umbral alcanzado → verificación obligatoria (token ausente → CAPTCHA_REQUIRED).
    captchaVerificationMiddleware(req, res, next);
  };
}
