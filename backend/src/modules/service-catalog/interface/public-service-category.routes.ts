// Ruta pública ServiceCategory (US-075 / BE-007).
//
//   GET /api/v1/service-categories → `{tree, flat}` filtrado a `is_active=true`.
//
// Sustituye al endpoint EMERGENT de US-040 en `vendor-management` — el shape ahora es
// `{tree, flat}` (Decisión PO D2) en lugar del array plano previo. El único caller
// (`vendorProfileApi.listServiceCategories`) se actualiza en el frontend para
// consumir `data.flat` con la misma proyección `{id, code, label}`.
//
// Auth: `sessionAuth` — cualquier rol autenticado (Decisión PO D10 / SEC-02). Sin
// `roleMiddleware` (no es admin-only).
import { Router } from 'express';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { ListServiceCategoriesUseCase } from '../application/list-service-categories.use-case.js';
import { PublicServiceCategoryController } from './public-service-category.controller.js';

const listUC = new ListServiceCategoriesUseCase(prisma);
const controller = new PublicServiceCategoryController(listUC);
const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });

export const publicServiceCategoryRouter = Router();
publicServiceCategoryRouter.get('/', sessionAuth, asyncHandler(controller.list));

export const publicServiceCategoryComposition = { listUC, controller } as const;
