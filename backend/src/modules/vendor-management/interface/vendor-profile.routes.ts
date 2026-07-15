// Rutas — vendor-management (US-040 / BE-005; US-041 / BE-006; US-042 / BE-004).
// Monta `POST /api/v1/vendors/me` (crear), `PATCH /api/v1/vendors/me` (editar),
// `DELETE /api/v1/vendors/me` (soft delete) y `POST /api/v1/vendors/me/categories`
// (cambio de categorías con tope acumulado 5).
// Auth: cookie de sesión firmada (US-094) + `roleMiddleware(['vendor'])` (ADR-SEC-003).
// Los rechazos anónimo/organizer/admin (SEC-01..05) los emiten estos middlewares canónicos.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { CreateVendorProfileUseCase } from '../application/create-vendor-profile.use-case.js';
import { UpdateVendorProfileUseCase } from '../application/update-vendor-profile.use-case.js';
import { SoftDeleteVendorProfileUseCase } from '../application/soft-delete-vendor-profile.use-case.js';
import { ChangeVendorCategoriesUseCase } from '../application/change-vendor-categories.use-case.js';
import {
  PrismaLocationReader,
  PrismaServiceCategoryLookup,
  PrismaVendorProfileRepository,
} from '../infrastructure/prisma-vendor-profile.repository.js';
import { PrismaAdminActionWriteAdapter } from '../infrastructure/prisma-admin-action-write.adapter.js';
import { StructuredVendorProfileEventLogger } from '../infrastructure/structured-vendor-profile-event-logger.js';
import { VendorProfileController } from './vendor-profile.controller.js';
import { CreateVendorProfileRequestSchema } from './dto/create-vendor-profile.request.js';
import { UpdateVendorProfileRequestSchema } from './dto/update-vendor-profile.request.js';
import { ChangeVendorCategoriesRequestSchema } from './dto/change-vendor-categories.request.js';

const repository = new PrismaVendorProfileRepository();
const locations = new PrismaLocationReader();
const categories = new PrismaServiceCategoryLookup();
const events = new StructuredVendorProfileEventLogger();
const adminActions = new PrismaAdminActionWriteAdapter();

const createUseCase = new CreateVendorProfileUseCase(repository, locations, categories, clock, events);
const updateUseCase = new UpdateVendorProfileUseCase(repository, locations, adminActions, clock, events);
const softDeleteUseCase = new SoftDeleteVendorProfileUseCase(repository, events);
const changeCategoriesUseCase = new ChangeVendorCategoriesUseCase(
  repository,
  categories,
  adminActions,
  clock,
  events,
);

const controller = new VendorProfileController(
  {
    create: createUseCase,
    update: updateUseCase,
    softDelete: softDeleteUseCase,
    changeCategories: changeCategoriesUseCase,
  },
  repository,
);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const vendorOnly = roleMiddleware(['vendor']);

export const vendorProfileRouter = Router();

vendorProfileRouter.get(
  '/me',
  sessionAuth,
  vendorOnly,
  asyncHandler(controller.getMine),
);

vendorProfileRouter.post(
  '/me',
  sessionAuth,
  vendorOnly,
  validateRequestMiddleware(z.object({ body: CreateVendorProfileRequestSchema })),
  asyncHandler(controller.create),
);

vendorProfileRouter.patch(
  '/me',
  sessionAuth,
  vendorOnly,
  validateRequestMiddleware(z.object({ body: UpdateVendorProfileRequestSchema })),
  asyncHandler(controller.update),
);

vendorProfileRouter.delete(
  '/me',
  sessionAuth,
  vendorOnly,
  asyncHandler(controller.softDelete),
);

vendorProfileRouter.post(
  '/me/categories',
  sessionAuth,
  vendorOnly,
  validateRequestMiddleware(z.object({ body: ChangeVendorCategoriesRequestSchema })),
  asyncHandler(controller.changeCategories),
);
