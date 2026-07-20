// Rutas Admin EventType (US-076 / BE-007). Registra 4 endpoints bajo
// `/api/v1/admin/event-types`:
//
//   GET    /                 → listado plano (incluye `is_active=false`)
//   POST   /                 → crear EventType (AC-01)
//   PATCH  /:id              → update / reactivate (AC-02)
//   DELETE /:id              → soft delete con reason (AC-03)
//
// Orden canónico: sessionAuth → adminOnly → validateRequest → handler (paridad
// EXACTA con `adminServiceCategoryRouter` de US-075).
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { CreateEventTypeUseCase } from '../application/create-event-type.use-case.js';
import { UpdateEventTypeUseCase } from '../application/update-event-type.use-case.js';
import { SoftDeleteEventTypeUseCase } from '../application/soft-delete-event-type.use-case.js';
import { ListEventTypesUseCase } from '../application/list-event-types.use-case.js';
import { AdminEventTypeController } from './admin-event-type.controller.js';
import {
  CreateEventTypeBodySchema,
  DeleteEventTypeBodySchema,
  EventTypeIdParamsSchema,
  UpdateEventTypeBodySchema,
} from './event-type.dto.js';

// Composition root del sub-módulo. Reusa clock/sessionRepo global + un logger dedicado.
const logger = new StructuredDomainEventLogger();
const createUC = new CreateEventTypeUseCase(logger, prisma);
const updateUC = new UpdateEventTypeUseCase(logger, prisma);
const softDeleteUC = new SoftDeleteEventTypeUseCase(logger, prisma);
const listUC = new ListEventTypesUseCase(prisma);
const controller = new AdminEventTypeController(createUC, updateUC, softDeleteUC, listUC);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const adminOnly = roleMiddleware(['admin']);

export const adminEventTypeRouter = Router();
adminEventTypeRouter.use(sessionAuth, adminOnly);

adminEventTypeRouter.get('/', asyncHandler(controller.list));

adminEventTypeRouter.post(
  '/',
  validateRequestMiddleware(z.object({ body: CreateEventTypeBodySchema })),
  asyncHandler(controller.create),
);

adminEventTypeRouter.patch(
  '/:id',
  validateRequestMiddleware(
    z.object({ params: EventTypeIdParamsSchema, body: UpdateEventTypeBodySchema }),
  ),
  asyncHandler(controller.update),
);

adminEventTypeRouter.delete(
  '/:id',
  validateRequestMiddleware(
    z.object({ params: EventTypeIdParamsSchema, body: DeleteEventTypeBodySchema }),
  ),
  asyncHandler(controller.softDelete),
);

// Composition root exportado también para tests IT (permite inyectar prisma stub).
export const adminEventTypeComposition = {
  createUC,
  updateUC,
  softDeleteUC,
  listUC,
  controller,
} as const;
