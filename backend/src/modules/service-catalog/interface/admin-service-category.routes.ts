// Rutas Admin ServiceCategory (US-075 / BE-007). Registra 4 endpoints bajo
// `/api/v1/admin/service-categories`:
//
//   GET    /                 → listado tree + flat (incluye `is_active=false`)
//   POST   /                 → crear categoría root o child (AC-01/AC-02)
//   PATCH  /:id              → update / reactivate (AC-03)
//   DELETE /:id              → soft delete con reason (AC-04)
//
// Orden canónico: sessionAuth → adminOnly → validateRequest → handler (paridad
// EXACTA con `adminReviewRouter` de US-067/US-077 y `adminVendorRouter` de US-047/US-074).
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { CreateServiceCategoryUseCase } from '../application/create-service-category.use-case.js';
import { UpdateServiceCategoryUseCase } from '../application/update-service-category.use-case.js';
import { SoftDeleteServiceCategoryUseCase } from '../application/soft-delete-service-category.use-case.js';
import { ListServiceCategoriesUseCase } from '../application/list-service-categories.use-case.js';
import { AdminServiceCategoryController } from './admin-service-category.controller.js';
import {
  CreateServiceCategoryBodySchema,
  DeleteServiceCategoryBodySchema,
  ServiceCategoryIdParamsSchema,
  UpdateServiceCategoryBodySchema,
} from './service-category.dto.js';

// Composition root del sub-módulo. Reusa clock/sessionRepo global + un logger dedicado.
const logger = new StructuredDomainEventLogger();
const createUC = new CreateServiceCategoryUseCase(logger, prisma);
const updateUC = new UpdateServiceCategoryUseCase(logger, prisma);
const softDeleteUC = new SoftDeleteServiceCategoryUseCase(logger, prisma);
const listUC = new ListServiceCategoriesUseCase(prisma);
const controller = new AdminServiceCategoryController(createUC, updateUC, softDeleteUC, listUC);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const adminOnly = roleMiddleware(['admin']);

export const adminServiceCategoryRouter = Router();
adminServiceCategoryRouter.use(sessionAuth, adminOnly);

// GET / — sin body/params/query validation (listado plano).
adminServiceCategoryRouter.get('/', asyncHandler(controller.list));

adminServiceCategoryRouter.post(
  '/',
  validateRequestMiddleware(z.object({ body: CreateServiceCategoryBodySchema })),
  asyncHandler(controller.create),
);

adminServiceCategoryRouter.patch(
  '/:id',
  validateRequestMiddleware(
    z.object({ params: ServiceCategoryIdParamsSchema, body: UpdateServiceCategoryBodySchema }),
  ),
  asyncHandler(controller.update),
);

adminServiceCategoryRouter.delete(
  '/:id',
  validateRequestMiddleware(
    z.object({ params: ServiceCategoryIdParamsSchema, body: DeleteServiceCategoryBodySchema }),
  ),
  asyncHandler(controller.softDelete),
);

// Composition root exportado también para tests IT (permite inyectar prisma stub).
export const adminServiceCategoryComposition = {
  createUC,
  updateUC,
  softDeleteUC,
  listUC,
  controller,
} as const;
