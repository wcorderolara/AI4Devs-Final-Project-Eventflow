// US-080 (PB-P1-046) / BE-003 — Rutas admin del visor del audit log AdminAction.
//
// SOLO expone `GET /` (AC-03 — inmutabilidad arquitectónica). El módulo NO registra POST,
// PATCH ni DELETE bajo esta ruta base: cualquier verbo de escritura sobre
// `/api/v1/admin/admin-actions/*` cae en el catch-all 404 (Express `notFoundMiddleware`),
// tal como exige la Tech Spec §7.
//
// Cadena: sessionAuth → roleMiddleware(['admin']) → validateRequestMiddleware(query) →
// controller.list. AdminGuard reuso patrón US-067/US-074/US-077.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { requireSession, requireRole } from '../../../infrastructure/auth-composition.js';
import { AdminActionsQuerySchema } from './admin-actions-query.dto.js';
import { ListAdminActionsUseCase } from '../application/list-admin-actions.use-case.js';
import { AdminActionsController } from './admin-actions.controller.js';

const listAdminActions = new ListAdminActionsUseCase();
const controller = new AdminActionsController({ listAdminActions });

export const adminActionsRouter = Router();

// Guards comunes: sesión válida + rol admin ANTES de la validación de query.
adminActionsRouter.use(requireSession, requireRole('admin'));

adminActionsRouter.get(
  '/',
  validateRequestMiddleware(z.object({ query: AdminActionsQuerySchema })),
  asyncHandler(controller.list),
);

// AC-03: NO se declaran POST/PATCH/DELETE. Cualquier verbo de escritura cae en el
// `notFoundMiddleware` global (404). Un test arquitectónico (QA-004) verifica esta invariante.
