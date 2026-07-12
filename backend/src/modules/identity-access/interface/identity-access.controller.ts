// Controlador de identity-access (US-094 / API-001). AC-01/02/05/06/07; AC-08.
// Controlador DELGADO: valida ya ocurrió en middleware, delega a use cases y serializa el envelope
// estándar (ADR-API-002). Login emite cookie de sesión HTTP-only firmada; jamás retorna el token
// en el JSON (SEC-03). Reset-request responde 202 genérico (anti-enumeración, decisión US-094).
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { issueSessionCookie, clearSessionCookie } from '../../../infrastructure/security/session-cookie.js';
import { logSessionEvent } from '../../../infrastructure/observability/session-event-logger.js';
import { resolvePreferredLanguage } from '../../../shared/interface/http/accept-language.js';
import { toAuthUserResponse } from '../../../shared/dto/auth-user.response.js';
import type {
  RegisterUserRequest,
  LoginUserRequest,
  PasswordResetRequest,
  PasswordResetDto,
} from '../dto/index.js';
import type { RegisterUserUseCase } from '../application/register-user.use-case.js';
import type { LoginUserUseCase } from '../application/login-user.use-case.js';
import type { LogoutUserUseCase } from '../application/logout-user.use-case.js';
import type { RequestPasswordResetUseCase } from '../application/request-password-reset.use-case.js';
import type { ResetPasswordUseCase } from '../application/reset-password.use-case.js';

export interface IdentityAccessUseCases {
  register: RegisterUserUseCase;
  login: LoginUserUseCase;
  logout: LogoutUserUseCase;
  requestPasswordReset: RequestPasswordResetUseCase;
  resetPassword: ResetPasswordUseCase;
}

export class IdentityAccessController {
  constructor(private readonly useCases: IdentityAccessUseCases) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as RegisterUserRequest;
    const { user, sessionId } = await this.useCases.register.execute(
      {
        email: body.email,
        password: body.password,
        // US-002 / BE-003: branching por variant — `businessName` espeja `users.name` hasta US-040.
        name: body.role === 'vendor' ? body.businessName : body.name,
        phone: body.phone,
        role: body.role,
        // AC-02 (US-001): sin preferencia explícita se infiere de `Accept-Language` (fallback es-LATAM).
        preferredLanguage:
          body.preferredLanguage ?? resolvePreferredLanguage(req.headers['accept-language']),
      },
      { correlationId: req.correlationId },
    );
    // AC-01 (US-001): el registro inicia sesión — cookie HTTP-only firmada; token nunca en el JSON.
    issueSessionCookie(res, sessionId);
    logSessionEvent('session.cookie.issued', { correlationId: req.correlationId, userId: user.id });
    res.status(201).json(success(toAuthUserResponse(user), req.correlationId ?? ''));
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as LoginUserRequest;
    const { user, sessionId } = await this.useCases.login.execute(
      { email: body.email, password: body.password },
      // US-003: la IP alimenta el contador del captcha condicional (EC-02).
      { correlationId: req.correlationId, ip: req.ip },
    );
    // Cookie HTTP-only firmada; el token NO viaja en el JSON (SEC-03).
    issueSessionCookie(res, sessionId);
    logSessionEvent('session.cookie.issued', { correlationId: req.correlationId, userId: user.id });
    res.status(200).json(success(toAuthUserResponse(user), req.correlationId ?? ''));
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.sessionId;
    if (sessionId) {
      await this.useCases.logout.execute(
        { sessionId, userId: req.user?.id },
        { correlationId: req.correlationId },
      );
    }
    clearSessionCookie(res);
    logSessionEvent('session.cookie.cleared', { correlationId: req.correlationId, userId: req.user?.id });
    res.status(204).end();
  };

  requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as PasswordResetRequest;
    await this.useCases.requestPasswordReset.execute(
      { email: body.email },
      { correlationId: req.correlationId },
    );
    // 202 genérico: idéntico exista o no el email (anti-enumeración).
    res.status(202).json(
      success(
        { message: 'If the email exists, a password reset link has been sent.' },
        req.correlationId ?? '',
      ),
    );
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as PasswordResetDto;
    await this.useCases.resetPassword.execute(
      { token: body.token, newPassword: body.newPassword },
      { correlationId: req.correlationId },
    );
    res.status(204).end();
  };
}
