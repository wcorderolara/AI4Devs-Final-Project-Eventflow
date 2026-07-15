// Rutas — vendor-management (US-040 / BE-005). Monta `POST /api/v1/vendors/me`.
// Auth: cookie de sesión firmada (US-094) + `roleMiddleware(['vendor'])` (ADR-SEC-003).
// Los rechazos anónimo/organizer/admin (SEC-01..05) los emiten estos middlewares canónicos: sin
// sesión → 401; rol distinto de `vendor` → 403. No se agregan guards redundantes.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { CreateVendorProfileUseCase } from '../application/create-vendor-profile.use-case.js';
import {
  PrismaLocationReader,
  PrismaServiceCategoryLookup,
  PrismaVendorProfileRepository,
} from '../infrastructure/prisma-vendor-profile.repository.js';
import { StructuredVendorProfileEventLogger } from '../infrastructure/structured-vendor-profile-event-logger.js';
import { VendorProfileController } from './vendor-profile.controller.js';
import { CreateVendorProfileRequestSchema } from './dto/create-vendor-profile.request.js';

const repository = new PrismaVendorProfileRepository();
const locations = new PrismaLocationReader();
const categories = new PrismaServiceCategoryLookup();
const events = new StructuredVendorProfileEventLogger();
const createUseCase = new CreateVendorProfileUseCase(repository, locations, categories, clock, events);
const controller = new VendorProfileController(createUseCase);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const vendorOnly = roleMiddleware(['vendor']);

export const vendorProfileRouter = Router();

vendorProfileRouter.post(
  '/me',
  sessionAuth,
  vendorOnly,
  validateRequestMiddleware(z.object({ body: CreateVendorProfileRequestSchema })),
  asyncHandler(controller.create),
);
