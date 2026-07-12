// Rutas de identity-access (US-094 / API-001; US-109 / BE-007). Doc 14 §24.2; ADR-API-001 (`/api/v1`).
// Orden de middleware por ruta pública sensible: rate limit → CAPTCHA → validación Zod → handler.
// (US-109: captcha ANTES de la validación de payload para que un token ausente devuelva el código
// estable CAPTCHA_REQUIRED — AC-05/EC-01/NT-01 — en lugar de VALIDATION_ERROR. El captcha corta
// antes de procesar credenciales/crear usuarios/emitir cookie — SEC-05.) Logout usa auth por cookie.
import { Router, type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { MethodNotAllowedError } from '../../../shared/domain/errors/method-not-allowed.error.js';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { captchaVerificationMiddleware } from '../../../shared/interface/middlewares/captcha-verification.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import {
  loginRateLimit,
  registerRateLimit,
  passwordResetRequestRateLimit,
  passwordResetConfirmRateLimit,
} from '../../../shared/interface/http/auth-rate-limits.js';
import {
  userRepository,
  sessionRepository,
  passwordResetTokenRepository,
  passwordHasher,
  resetTokenGenerator,
  passwordResetNotifier,
  clock,
  authEventLogger,
  welcomeEmailNotifier,
  authAttemptTracker,
} from '../../../infrastructure/auth-composition.js';
import { createNoActiveSessionGuard } from '../../../shared/interface/http/no-active-session.guard.js';
import { createConditionalCaptchaMiddleware } from '../../../shared/interface/http/conditional-captcha.js';
import {
  RegisterUserRequestSchema,
  LoginUserRequestSchema,
  PasswordResetRequestSchema,
  PasswordResetSchema,
} from '../dto/index.js';
import { RegisterUserUseCase } from '../application/register-user.use-case.js';
import { LoginUserUseCase } from '../application/login-user.use-case.js';
import { LogoutUserUseCase } from '../application/logout-user.use-case.js';
import { RequestPasswordResetUseCase } from '../application/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from '../application/reset-password.use-case.js';
import { IdentityAccessController } from './identity-access.controller.js';

const controller = new IdentityAccessController({
  register: new RegisterUserUseCase(
    userRepository,
    passwordHasher,
    sessionRepository,
    clock,
    authEventLogger,
    welcomeEmailNotifier,
  ),
  login: new LoginUserUseCase(
    userRepository,
    passwordHasher,
    sessionRepository,
    clock,
    authEventLogger,
    authAttemptTracker,
  ),
  logout: new LogoutUserUseCase(sessionRepository, clock, authEventLogger),
  requestPasswordReset: new RequestPasswordResetUseCase(
    userRepository,
    passwordResetTokenRepository,
    resetTokenGenerator,
    passwordResetNotifier,
    clock,
    authEventLogger,
  ),
  resetPassword: new ResetPasswordUseCase(
    passwordResetTokenRepository,
    resetTokenGenerator,
    passwordHasher,
    clock,
    authEventLogger,
  ),
});

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const noActiveSessionGuard = createNoActiveSessionGuard({ sessions: sessionRepository, clock });

export const identityAccessRouter = Router();

// US-001 / BE-002 — orden: rate limit → captcha → validación Zod → guard solo-anónimo → handler.
identityAccessRouter.post(
  '/register',
  registerRateLimit,
  captchaVerificationMiddleware,
  validateRequestMiddleware(z.object({ body: RegisterUserRequestSchema })),
  noActiveSessionGuard,
  asyncHandler(controller.register),
);

// US-003 / BE-005 — cadena: rate limit (AC-05) → guard solo-anónimo (AC-04, 409) → validación
// Zod → captcha CONDICIONAL N=3 (EC-02; antes del umbral se ignora el token) → handler.
const conditionalCaptcha = createConditionalCaptchaMiddleware({ attempts: authAttemptTracker });

identityAccessRouter.post(
  '/login',
  loginRateLimit,
  noActiveSessionGuard,
  validateRequestMiddleware(z.object({ body: LoginUserRequestSchema })),
  conditionalCaptcha,
  asyncHandler(controller.login),
);

// US-005 / BE-003 — logout estricto: requiere sesión (401 sin ella; se audita EC-01) y responde
// 204 limpiando la cookie. El error-tap emite `auth.logout.no_session` sin alterar el 401 del guard.
identityAccessRouter.post(
  '/logout',
  sessionAuth,
  asyncHandler(controller.logout),
  ((err, req, _res, next) => {
    if (err instanceof UnauthorizedError) {
      authEventLogger.emit('auth.logout.no_session', { correlationId: req.correlationId });
    }
    next(err);
  }) as ErrorRequestHandler,
);
// US-005 / EC-03: cualquier otro método sobre /logout → 405 METHOD_NOT_ALLOWED (N4).
identityAccessRouter.all('/logout', (_req, _res, next) => next(new MethodNotAllowedError()));

identityAccessRouter.post(
  '/password/reset-request',
  passwordResetRequestRateLimit,
  captchaVerificationMiddleware,
  validateRequestMiddleware(z.object({ body: PasswordResetRequestSchema })),
  asyncHandler(controller.requestPasswordReset),
);

// US-004 / BE-005: el confirm lleva rate limit por IP (5/IP/10min — Doc 19 §6); sin captcha.
identityAccessRouter.post(
  '/password/reset',
  passwordResetConfirmRateLimit,
  validateRequestMiddleware(z.object({ body: PasswordResetSchema })),
  asyncHandler(controller.resetPassword),
);
