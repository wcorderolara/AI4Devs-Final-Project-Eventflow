// US-027 (PB-P1-018 / API-001) — Router del listado paginado del checklist.
// Endpoint canónico: `GET /api/v1/events/:eventId/tasks` (Tech Spec §9). Se monta en `app.ts`
// ANTES de `eventPlanningRouter` para capturar `/events/:eventId/tasks` sin colisionar con
// el resto de rutas de eventos (patrón US-031 / US-097).
// Composición canónica US-111: `auth → role → handler`. La validación de query es tolerante
// y se hace dentro del controller (no como middleware) para permitir el descarte silencioso
// de filtros inválidos (EC-01) sin devolver 400. El param `eventId` se valida en el controller
// con Zod para preservar el envelope de error canónico.
import { Router } from 'express';
import { roleMiddleware } from '../../../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../../../infrastructure/auth-composition.js';
import { ListEventTasksUseCase } from '../../application/list-event-tasks.use-case.js';
import { ListEventTasksTelemetry } from '../../application/list-event-tasks-telemetry.js';
import { PrismaEventTaskListRepository } from '../../infrastructure/repositories/prisma-event-task-list.repository.js';
import { ListEventTasksController } from './list-event-tasks.controller.js';

const repository = new PrismaEventTaskListRepository();
const telemetry = new ListEventTasksTelemetry();
const useCase = new ListEventTasksUseCase(repository, telemetry);
const controller = new ListEventTasksController(useCase);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizerOnly = roleMiddleware(['organizer']);

export const eventTasksListRouter = Router();

// SEC-04/05: `roleMiddleware(['organizer'])` rechaza vendor y admin con 403 antes del handler.
// SEC-06: la no-revelación (ajeno/inexistente/soft-deleted → 404) se resuelve en el use case
// vía `isOwnedEvent`.
eventTasksListRouter.get(
  '/events/:eventId/tasks',
  sessionAuth,
  organizerOnly,
  asyncHandler(controller.handle),
);
