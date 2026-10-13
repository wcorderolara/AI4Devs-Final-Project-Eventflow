// Rutas de user-profile (US-094 / API-001). Todas requieren sesión válida (cookie HTTP-only).
// Montadas bajo `/api/v1/users` → rutas canónicas `/api/v1/users/me*` (decisión US-094, no `/me`).
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { userRepository, passwordHasher, requireSession } from '../../../infrastructure/auth-composition.js';
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

export const userProfileRouter = Router();

userProfileRouter.get('/me', requireSession, asyncHandler(controller.getMe));

userProfileRouter.patch(
  '/me',
  requireSession,
  validateRequestMiddleware(z.object({ body: UpdateCurrentUserProfileSchema })),
  asyncHandler(controller.updateMe),
);

userProfileRouter.patch(
  '/me/preferred-language',
  requireSession,
  validateRequestMiddleware(z.object({ body: ChangePreferredLanguageSchema })),
  asyncHandler(controller.changeLanguage),
);

userProfileRouter.post(
  '/me/change-password',
  requireSession,
  validateRequestMiddleware(z.object({ body: ChangePasswordSchema })),
  asyncHandler(controller.changePassword),
);
