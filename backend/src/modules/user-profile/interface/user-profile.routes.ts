// Rutas de user-profile (US-094 / API-001). Todas requieren sesión válida (cookie HTTP-only).
// Montadas bajo `/api/v1/users` → rutas canónicas `/api/v1/users/me*` (decisión US-094, no `/me`).
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import {
  userRepository,
  sessionRepository,
  passwordHasher,
  clock,
} from '../../../infrastructure/auth-composition.js';
import {
  UpdateCurrentUserProfileSchema,
  ChangePreferredLanguageSchema,
  ChangePasswordSchema,
} from '../dto/index.js';
import { GetCurrentUserUseCase } from '../application/get-current-user.use-case.js';
import { UpdateCurrentUserProfileUseCase } from '../application/update-current-user-profile.use-case.js';
import { ChangePreferredLanguageUseCase } from '../application/change-preferred-language.use-case.js';
import { ChangePasswordUseCase } from '../application/change-password.use-case.js';
import { UserProfileController } from './user-profile.controller.js';

const controller = new UserProfileController({
  getCurrentUser: new GetCurrentUserUseCase(userRepository),
  updateProfile: new UpdateCurrentUserProfileUseCase(userRepository),
  changeLanguage: new ChangePreferredLanguageUseCase(userRepository),
  changePassword: new ChangePasswordUseCase(userRepository, passwordHasher),
});

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });

export const userProfileRouter = Router();

userProfileRouter.get('/me', sessionAuth, asyncHandler(controller.getMe));

userProfileRouter.patch(
  '/me',
  sessionAuth,
  validateRequestMiddleware(z.object({ body: UpdateCurrentUserProfileSchema })),
  asyncHandler(controller.updateMe),
);

userProfileRouter.patch(
  '/me/preferred-language',
  sessionAuth,
  validateRequestMiddleware(z.object({ body: ChangePreferredLanguageSchema })),
  asyncHandler(controller.changeLanguage),
);

userProfileRouter.post(
  '/me/change-password',
  sessionAuth,
  validateRequestMiddleware(z.object({ body: ChangePasswordSchema })),
  asyncHandler(controller.changePassword),
);
