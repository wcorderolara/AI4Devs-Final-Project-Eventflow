// Rutas Admin VendorProfile (US-047 / BE-004 + US-074 / BE-003).
//
//   GET  /api/v1/admin/vendors                (US-074 · BE-003) → listado paginado + filtros.
//   POST /api/v1/admin/vendors/:id/moderate   (US-047 · BE-004) → moderación atómica
//     (approve|reject|hide|unhide) + AdminAction + 2 notifs vendor.
//
// Auth: `sessionAuth` + `roleMiddleware(['admin'])` — organizer/vendor ⇒ 403; sin sesión ⇒ 401.
// Orden canónico por request: sessionAuth → adminOnly → validateRequest (Zod strict) → handler
// (paridad EXACTA con `adminReviewRouter` de US-067/US-077 y `adminEventsRouter` de US-016).
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { PrismaQuoteNotificationSenderAdapter } from '../../../infrastructure/notifications/prisma-quote-notification-sender.adapter.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { QuoteEventNotificationService } from '../../quote-flow/services/quote-event-notification.service.js';
import { ModerateVendorUseCase } from '../application/moderate-vendor.use-case.js';
import { ListVendorsForAdminUseCase } from '../application/list-vendors-for-admin.use-case.js';
import { AdminVendorController } from './admin-vendor.controller.js';
import {
  ModerateVendorBodySchema,
  ModerateVendorParamsSchema,
} from './moderate-vendor.dto.js';
import { AdminVendorsQuerySchema } from './admin-vendors-query.dto.js';

// Composition root del sub-módulo Admin Vendors. Reusa las primitivas globales (auth/clock/
// logger) + el adapter Prisma de notifications (US-049 BE-003) + el service común extendido a
// 13 eventos (US-047 BE-002). No crea instancias singleton globales.
const logger = new StructuredDomainEventLogger();
const notifications = new PrismaQuoteNotificationSenderAdapter(prisma);
const vendorEvents = new QuoteEventNotificationService(notifications, logger);
const moderateVendorUseCase = new ModerateVendorUseCase(vendorEvents, clock, logger, prisma);
const listVendorsUseCase = new ListVendorsForAdminUseCase(prisma);
const controller = new AdminVendorController(moderateVendorUseCase, listVendorsUseCase);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const adminOnly = roleMiddleware(['admin']);

export const adminVendorRouter = Router();

// Guards comunes: sesión válida + rol admin ANTES de validación (paridad adminReviewRouter).
adminVendorRouter.use(sessionAuth, adminOnly);

// US-074: listado paginado admin — se registra ANTES del `/:id/moderate` para preservar orden
// de match (paridad con `adminReviewRouter` de US-077).
adminVendorRouter.get(
  '/',
  validateRequestMiddleware(z.object({ query: AdminVendorsQuerySchema })),
  asyncHandler(controller.list),
);

adminVendorRouter.post(
  '/:id/moderate',
  validateRequestMiddleware(
    z.object({
      params: ModerateVendorParamsSchema,
      body: ModerateVendorBodySchema,
    }),
  ),
  asyncHandler(controller.moderate),
);
