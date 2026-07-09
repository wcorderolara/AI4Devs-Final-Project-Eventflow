// Rutas de identity-access (US-090 / BE-006 stub; US-092 / BE-006 wiring). Doc 14 §24.2.
// Aplica `validateRequestMiddleware` POR RUTA (Doc 14 §8.2): rutas públicas (register/login) no
// llevan authMiddleware. El schema de ruta envuelve el DTO del body como `z.object({ body })`,
// coherente con el contrato del middleware que valida `{ body, params, query }`.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { RegisterUserRequestSchema, LoginUserRequestSchema } from '../dto/index.js';
import { IdentityAccessController } from './identity-access.controller.js';

const controller = new IdentityAccessController();

export const identityAccessRouter = Router();

identityAccessRouter.post(
  '/register',
  validateRequestMiddleware(z.object({ body: RegisterUserRequestSchema })),
  controller.register,
);

identityAccessRouter.post(
  '/login',
  validateRequestMiddleware(z.object({ body: LoginUserRequestSchema })),
  controller.login,
);
