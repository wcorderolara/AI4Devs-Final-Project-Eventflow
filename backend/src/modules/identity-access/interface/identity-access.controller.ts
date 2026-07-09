// Controlador de identity-access (US-090 / BE-006 stub; US-092 / BE-006 wiring). Doc 14 §24.2.
// Placeholder que valida el wiring de `validateRequestMiddleware`: lee `req.validated.body` tipado
// (poblado por el middleware) y responde 501. La lógica de negocio (use cases, hashing, captcha,
// persistencia) pertenece a la feature story de identity-access (PB-P0-004+).
import type { Request, Response } from 'express';
import type { RegisterUserRequest, LoginUserRequest } from '../dto/index.js';

export class IdentityAccessController {
  register = (req: Request, res: Response): void => {
    const body = req.validated?.body as RegisterUserRequest;
    // No se exponen datos sensibles (password/captchaToken/email); solo el rol (no PII).
    res.status(501).json({
      code: 'NOT_IMPLEMENTED',
      message: 'Registro pendiente de implementación (PB-P0-004)',
      role: body.role,
    });
  };

  login = (req: Request, res: Response): void => {
    const body = req.validated?.body as LoginUserRequest;
    res.status(501).json({
      code: 'NOT_IMPLEMENTED',
      message: 'Login pendiente de implementación (PB-P0-004)',
      emailProvided: Boolean(body.email),
    });
  };
}
