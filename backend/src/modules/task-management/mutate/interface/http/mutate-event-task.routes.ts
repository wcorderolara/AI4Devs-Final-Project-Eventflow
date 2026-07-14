// US-029 (PB-P1-018 / API-001..003, SEC-001/002) — Router de las 3 mutaciones.
// Rutas canónicas (Tech Spec §9):
//   PATCH  /api/v1/events/:eventId/tasks/:taskId          → editar contenido
//   PATCH  /api/v1/events/:eventId/tasks/:taskId/status   → transicionar estado
//   DELETE /api/v1/events/:eventId/tasks/:taskId          → soft delete
// Se registra la ruta `/status` PRIMERO para evitar matching ambiguo.
// Composición canónica US-111: `sessionAuth → roleMiddleware(['organizer']) → asyncHandler`.
// Vendor/admin → 403 antes del handler. Ownership + no-revelación 404 los aplica el use case.
import { Router } from 'express';
import { roleMiddleware } from '../../../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../../../infrastructure/auth-composition.js';
import { prisma } from '../../../../../shared/infrastructure/prisma/prisma.client.js';
import { PrismaEventTaskMutateRepository } from '../../infrastructure/prisma-event-task-mutate.repository.js';
import { PrismaServiceCategoryReadAdapter } from '../../../create/infrastructure/adapters/prisma-service-category-read.adapter.js';
import { UpdateEventTaskContentUseCase } from '../../application/update-event-task-content.use-case.js';
import { UpdateEventTaskStatusUseCase } from '../../application/update-event-task-status.use-case.js';
import { SoftDeleteEventTaskUseCase } from '../../application/soft-delete-event-task.use-case.js';
import { MutateEventTaskController } from './mutate-event-task.controller.js';

const repository = new PrismaEventTaskMutateRepository();
const categoryReader = new PrismaServiceCategoryReadAdapter();
const updateContentUseCase = new UpdateEventTaskContentUseCase(prisma, repository, categoryReader);
const updateStatusUseCase = new UpdateEventTaskStatusUseCase(prisma, repository);
const softDeleteUseCase = new SoftDeleteEventTaskUseCase(prisma, repository);

const controller = new MutateEventTaskController(
  updateContentUseCase,
  updateStatusUseCase,
  softDeleteUseCase,
);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizerOnly = roleMiddleware(['organizer']);

export const eventTasksMutateRouter = Router();

// /status debe registrarse ANTES para que Express matchee la ruta más específica primero.
eventTasksMutateRouter.patch(
  '/events/:eventId/tasks/:taskId/status',
  sessionAuth,
  organizerOnly,
  asyncHandler(controller.patchStatus),
);

eventTasksMutateRouter.patch(
  '/events/:eventId/tasks/:taskId',
  sessionAuth,
  organizerOnly,
  asyncHandler(controller.patchContent),
);

eventTasksMutateRouter.delete(
  '/events/:eventId/tasks/:taskId',
  sessionAuth,
  organizerOnly,
  asyncHandler(controller.delete),
);
