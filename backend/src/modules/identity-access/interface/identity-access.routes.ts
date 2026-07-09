// Rutas de identity-access (US-094 / API-001). Doc 14 §24.2; ADR-API-001 (`/api/v1`).
// Orden de middleware por ruta pública sensible: rate limit → validación Zod → captcha → handler.
// (Validación antes de captcha: los errores de forma devuelven VALIDATION_ERROR; captcha corta
// antes de procesar credenciales/crear usuarios — SEC-002/EC-04.) Logout usa auth por cookie.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { captchaVerificationMiddleware } from '../../../shared/interface/middlewares/captcha-verification.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import {
  loginRateLimit,
  registerRateLimit,
  passwordResetRequestRateLimit,
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
} from '../../../infrastructure/auth-composition.js';
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
  register: new RegisterUserUseCase(userRepository, passwordHasher, authEventLogger),
  login: new LoginUserUseCase(userRepository, passwordHasher, sessionRepository, clock, authEventLogger),
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

export const identityAccessRouter = Router();

identityAccessRouter.post(
  '/register',
  registerRateLimit,
  validateRequestMiddleware(z.object({ body: RegisterUserRequestSchema })),
  captchaVerificationMiddleware,
  asyncHandler(controller.register),
);

identityAccessRouter.post(
  '/login',
  loginRateLimit,
  validateRequestMiddleware(z.object({ body: LoginUserRequestSchema })),
  captchaVerificationMiddleware,
  asyncHandler(controller.login),
);

identityAccessRouter.post('/logout', sessionAuth, asyncHandler(controller.logout));

identityAccessRouter.post(
  '/password/reset-request',
  passwordResetRequestRateLimit,
  validateRequestMiddleware(z.object({ body: PasswordResetRequestSchema })),
  captchaVerificationMiddleware,
  asyncHandler(controller.requestPasswordReset),
);

identityAccessRouter.post(
  '/password/reset',
  validateRequestMiddleware(z.object({ body: PasswordResetSchema })),
  asyncHandler(controller.resetPassword),
);
