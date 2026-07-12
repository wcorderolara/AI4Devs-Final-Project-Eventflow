// Rutas de catálogos (US-009). `/api/v1/event-types` y `/api/v1/locations`. Requieren sesión
// válida (cualquier rol autenticado); son datos de referencia de baja sensibilidad. Sin body.
import { Router } from 'express';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import {
  PrismaEventTypeRepository,
  PrismaLocationRepository,
} from '../infrastructure/prisma-catalog.repository.js';
import { ListActiveEventTypesUseCase } from '../application/list-event-types.use-case.js';
import { ListActiveLocationsUseCase } from '../application/list-locations.use-case.js';
import { CatalogController } from './catalog.controller.js';

const eventTypeRepo = new PrismaEventTypeRepository();
const locationRepo = new PrismaLocationRepository();

const controller = new CatalogController({
  listEventTypes: new ListActiveEventTypesUseCase(eventTypeRepo),
  listLocations: new ListActiveLocationsUseCase(locationRepo),
});

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });

export const eventTypesRouter = Router();
eventTypesRouter.get('/', sessionAuth, asyncHandler(controller.listEventTypes));

export const locationsRouter = Router();
locationsRouter.get('/', sessionAuth, asyncHandler(controller.listLocations));
