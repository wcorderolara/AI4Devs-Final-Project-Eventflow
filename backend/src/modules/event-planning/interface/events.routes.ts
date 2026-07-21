// Rutas de event-planning (US-095 / API-001, SEC-001/002). Doc 16 bajo `/api/v1/events`.
// Cadena por ruta: sessionAuth (401) → organizer role guard (403) → validación Zod (400/422) →
// handler. Ownership (masked 404) se aplica dentro de los use cases vía queries owner-scoped.
// Se registran las 6 rutas Doc 16 + `DELETE /:eventId` (soft delete de borrador, US-012).
// NO se exponen `/:id/status` ni `/admin/events`.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import {
  CreateEventRequestSchema,
  UpdateEventRequestSchema,
  ListEventsQuerySchema,
  EventIdParamSchema,
} from '../dto/index.js';
import { PrismaEventRepository } from '../infrastructure/prisma-event.repository.js';
import {
  PrismaEventTypeRepository,
  PrismaLocationRepository,
} from '../infrastructure/prisma-catalog.repository.js';
import { PrismaOrganizerLanguageLookup } from '../infrastructure/prisma-organizer-language.lookup.js';
import { StructuredEventAuditLogger } from '../infrastructure/structured-event-audit-logger.js';
import { CreateEventUseCase } from '../application/create-event.use-case.js';
import { ListMyEventsUseCase } from '../application/list-my-events.use-case.js';
import { GetEventByIdUseCase } from '../application/get-event-by-id.use-case.js';
import { UpdateEventUseCase } from '../application/update-event.use-case.js';
import { ActivateEventUseCase } from '../application/activate-event.use-case.js';
import { CancelEventUseCase } from '../application/cancel-event.use-case.js';
import { SoftDeleteEventUseCase } from '../application/soft-delete-event.use-case.js';
import { EventsController } from './events.controller.js';

const eventRepo = new PrismaEventRepository();
const eventTypeRepo = new PrismaEventTypeRepository();
const locationRepo = new PrismaLocationRepository();
const organizerLanguageLookup = new PrismaOrganizerLanguageLookup();
const audit = new StructuredEventAuditLogger();

const controller = new EventsController({
  create: new CreateEventUseCase(eventRepo, eventTypeRepo, locationRepo, audit, organizerLanguageLookup),
  list: new ListMyEventsUseCase(eventRepo),
  getById: new GetEventByIdUseCase(eventRepo),
  update: new UpdateEventUseCase(eventRepo, eventTypeRepo, locationRepo, audit),
  activate: new ActivateEventUseCase(eventRepo, audit),
  cancel: new CancelEventUseCase(eventRepo, audit),
  softDelete: new SoftDeleteEventUseCase(eventRepo, audit),
});

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizerOnly = roleMiddleware(['organizer']);

export const eventPlanningRouter = Router();

// Guards comunes a todas las rutas: sesión válida + rol organizer.
eventPlanningRouter.use(sessionAuth, organizerOnly);

eventPlanningRouter.post(
  '/',
  validateRequestMiddleware(z.object({ body: CreateEventRequestSchema })),
  asyncHandler(controller.create),
);

eventPlanningRouter.get(
  '/',
  validateRequestMiddleware(z.object({ query: ListEventsQuerySchema })),
  asyncHandler(controller.list),
);

eventPlanningRouter.get(
  '/:eventId',
  validateRequestMiddleware(z.object({ params: EventIdParamSchema })),
  asyncHandler(controller.getById),
);

eventPlanningRouter.patch(
  '/:eventId',
  validateRequestMiddleware(z.object({ params: EventIdParamSchema, body: UpdateEventRequestSchema })),
  asyncHandler(controller.update),
);

eventPlanningRouter.post(
  '/:eventId/activate',
  validateRequestMiddleware(z.object({ params: EventIdParamSchema })),
  asyncHandler(controller.activate),
);

eventPlanningRouter.post(
  '/:eventId/cancel',
  validateRequestMiddleware(z.object({ params: EventIdParamSchema })),
  asyncHandler(controller.cancel),
);

// US-012: soft delete de borrador (204). El estado != draft → 409; ajeno/eliminado → 404.
eventPlanningRouter.delete(
  '/:eventId',
  validateRequestMiddleware(z.object({ params: EventIdParamSchema })),
  asyncHandler(controller.softDelete),
);
