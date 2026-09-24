// Rutas OAuth Google (US-008 / API-001; ADR-API-001 `/api/v1`). Se exponen mediante una FACTORY
// (`createOAuthGoogleRouter`) para que el `OAuthProvider` (real o mock) se construya SOLO cuando
// las rutas se montan (app.ts lo condiciona a `isGoogleOAuthRoutable()`), evitando instanciar el
// mock en producción. Orden por ruta: rate limit → (guard solo-anónimo) → validación Zod → handler.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { loginRateLimit } from '../../../shared/interface/http/auth-rate-limits.js';
import { createNoActiveSessionGuard } from '../../../shared/interface/http/no-active-session.guard.js';
import {
  userRepository,
  sessionRepository,
  clock,
  authEventLogger,
} from '../../../infrastructure/auth-composition.js';
import { createOAuthProvider } from '../../../infrastructure/oauth/oauth-provider.factory.js';
import { generateStateNonce } from '../../../infrastructure/security/oauth-state-cookie.js';
import { StartGoogleOAuthUseCase } from '../application/start-google-oauth.use-case.js';
import { HandleGoogleCallbackUseCase } from '../application/handle-google-callback.use-case.js';
import { CompleteGoogleSignupUseCase } from '../application/complete-google-signup.use-case.js';
import { ConfirmGoogleLinkUseCase } from '../application/confirm-google-link.use-case.js';
import {
  GoogleCallbackQuerySchema,
  CompleteGoogleSignupSchema,
  ConfirmGoogleLinkSchema,
} from '../dto/oauth-google.request.js';
import { OAuthGoogleController } from './oauth-google.controller.js';

export function createOAuthGoogleRouter(): Router {
  const provider = createOAuthProvider();
  const controller = new OAuthGoogleController({
    start: new StartGoogleOAuthUseCase(provider, generateStateNonce),
    callback: new HandleGoogleCallbackUseCase(provider, userRepository, sessionRepository, clock, authEventLogger),
    completeSignup: new CompleteGoogleSignupUseCase(userRepository, sessionRepository, clock, authEventLogger),
    confirmLink: new ConfirmGoogleLinkUseCase(userRepository, sessionRepository, clock, authEventLogger),
  });

  const noActiveSessionGuard = createNoActiveSessionGuard({ sessions: sessionRepository, clock });
  const router = Router();

  // GET /auth/google — inicia el flujo. AUTH-TS-02: sesión activa → 409 (guard). AUTH-TS-01: 302.
  router.get('/', loginRateLimit, noActiveSessionGuard, controller.start);

  // GET /auth/google/callback — procesa el retorno de Google (302 por camino / error neutro).
  router.get(
    '/callback',
    validateRequestMiddleware(z.object({ query: GoogleCallbackQuerySchema })),
    asyncHandler(controller.callback),
  );

  // POST /auth/google/complete-signup — completa el signup con rol (VR-03).
  router.post(
    '/complete-signup',
    loginRateLimit,
    validateRequestMiddleware(z.object({ body: CompleteGoogleSignupSchema })),
    asyncHandler(controller.completeSignup),
  );

  // POST /auth/google/confirm-link — confirma la vinculación (AC-03).
  router.post(
    '/confirm-link',
    loginRateLimit,
    validateRequestMiddleware(z.object({ body: ConfirmGoogleLinkSchema })),
    asyncHandler(controller.confirmLink),
  );

  return router;
}
