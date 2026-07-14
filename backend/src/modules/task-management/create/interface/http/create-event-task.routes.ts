// US-028 (PB-P1-018 / API-001, BE-006, SEC-001/002) — Router del endpoint POST.
// Endpoint canónico: `POST /api/v1/events/:eventId/tasks` (Tech Spec §9). Se monta a nivel de
// `/api/v1` ANTES de `eventPlanningRouter` (mismo patrón que US-027/US-031) para capturar
// `/events/:eventId/tasks` sin colisionar. Composición canónica US-111: `auth → role → handler`.
// La validación de path/body corre dentro del controller para poder capturar `body.ignoredFields`
// sobre el body crudo (AC-03) — no se usa `validateRequestMiddleware`.
import { Router } from 'express';
import { roleMiddleware } from '../../../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../../../infrastructure/auth-composition.js';
import { prisma } from '../../../../../shared/infrastructure/prisma/prisma.client.js';
import { CreateEventTaskUseCase } from '../../application/create-event-task.use-case.js';
import { CreateEventTaskTelemetry } from '../../application/create-event-task-telemetry.js';
import { PrismaEventTaskCreateRepository } from '../../infrastructure/repositories/prisma-event-task-create.repository.js';
import { PrismaOwnedEventForCreateReader } from '../../infrastructure/repositories/prisma-owned-event-for-create.reader.js';
import { PrismaServiceCategoryReadAdapter } from '../../infrastructure/adapters/prisma-service-category-read.adapter.js';
import { CreateEventTaskController } from './create-event-task.controller.js';

const repository = new PrismaEventTaskCreateRepository();
const eventReader = new PrismaOwnedEventForCreateReader();
const categoryReader = new PrismaServiceCategoryReadAdapter();
const telemetry = new CreateEventTaskTelemetry();
const useCase = new CreateEventTaskUseCase(
  prisma,
  eventReader,
  categoryReader,
  repository,
  telemetry,
);
const controller = new CreateEventTaskController(useCase);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizerOnly = roleMiddleware(['organizer']);

export const eventTasksCreateRouter = Router();

// SEC-02/03 (AUTH-TS-03..05): `roleMiddleware(['organizer'])` rechaza vendor/admin con 403
// FORBIDDEN antes del handler; sin sesión → 401 UNAUTHORIZED vía sessionAuth. La no-revelación
// (SEC-04) se resuelve en el use case por `OwnedEventForCreateReader.findOwnedForUpdate` → 404.
eventTasksCreateRouter.post(
  '/events/:eventId/tasks',
  sessionAuth,
  organizerOnly,
  asyncHandler(controller.handle),
);
