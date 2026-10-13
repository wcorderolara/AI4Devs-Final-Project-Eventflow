// Rutas — VendorService (US-044 / BE-007). 4 endpoints bajo `/api/v1/vendors/me/services[/:id]`.
// Auth: sesión firmada + `roleMiddleware(['vendor'])`. Los rechazos anónimo/organizer/admin
// (SEC-01..05) los emiten los middlewares canónicos (401 / 403).
// Se monta ANTES de `/vendors/me/portfolio` y `/vendors` en `app.ts` para no colisionar por
// solapamiento de prefijos.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { clock, requireSession, requireRole } from '../../../infrastructure/auth-composition.js';
import { CreateVendorServiceUseCase } from '../application/create-vendor-service.use-case.js';
import { UpdateVendorServiceUseCase } from '../application/update-vendor-service.use-case.js';
import { DeactivateVendorServiceUseCase } from '../application/deactivate-vendor-service.use-case.js';
import { ListVendorServicesUseCase } from '../application/list-vendor-services.use-case.js';
import {
  PrismaServiceCategoryLookup,
  PrismaVendorProfileRepository,
} from '../infrastructure/prisma-vendor-profile.repository.js';
import { PrismaVendorServiceRepository } from '../infrastructure/prisma-vendor-service.repository.js';
import { StructuredVendorServiceEventLogger } from '../infrastructure/structured-vendor-service-event-logger.js';
import { VendorServiceController } from './vendor-service.controller.js';
import { CreateVendorServiceRequestSchema } from './dto/create-vendor-service.request.js';
import { UpdateVendorServiceRequestSchema } from './dto/update-vendor-service.request.js';

const profileRepository = new PrismaVendorProfileRepository();
const serviceRepository = new PrismaVendorServiceRepository();
const categoryLookup = new PrismaServiceCategoryLookup();
const events = new StructuredVendorServiceEventLogger();

const createUseCase = new CreateVendorServiceUseCase(
  profileRepository,
  serviceRepository,
  categoryLookup,
  clock,
  events,
);
const updateUseCase = new UpdateVendorServiceUseCase(
  profileRepository,
  serviceRepository,
  categoryLookup,
  clock,
  events,
);
const deactivateUseCase = new DeactivateVendorServiceUseCase(
  profileRepository,
  serviceRepository,
  clock,
  events,
);
const listUseCase = new ListVendorServicesUseCase(profileRepository, serviceRepository);

const controller = new VendorServiceController({
  create: createUseCase,
  update: updateUseCase,
  deactivate: deactivateUseCase,
  list: listUseCase,
});

export const vendorServiceRouter = Router();

vendorServiceRouter.get('/', requireSession, requireRole('vendor'), asyncHandler(controller.list));

vendorServiceRouter.post(
  '/',
  requireSession,
  requireRole('vendor'),
  validateRequestMiddleware(z.object({ body: CreateVendorServiceRequestSchema })),
  asyncHandler(controller.create),
);

vendorServiceRouter.patch(
  '/:id',
  requireSession,
  requireRole('vendor'),
  validateRequestMiddleware(z.object({ body: UpdateVendorServiceRequestSchema })),
  asyncHandler(controller.update),
);

vendorServiceRouter.delete(
  '/:id',
  requireSession,
  requireRole('vendor'),
  asyncHandler(controller.deactivate),
);
