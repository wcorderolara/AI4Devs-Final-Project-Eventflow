// US-016 / BE-003 / BE-005 — Rutas admin para eventos. Todas requieren sesión válida + rol `admin`.
// - GET  /api/v1/admin/events            → US-078 · listado paginado con filtros.
// - GET  /api/v1/admin/events/:id        → US-016 · detalle read-only + AdminAction(view_event).
// - PATCH/DELETE/POST /api/v1/admin/events/:id → 403 FORBIDDEN_WRITE (AC-02 US-016; DEV-1 US-078).
//
// La cadena por ruta preserva el orden canónico: sessionAuth → role guard → validación Zod → handler.
// El `withCorrelationId` es global (correlationIdMiddleware en app.ts §1), no hace falta anexarlo aquí.
//
// Solo lectura arquitectónica (US-078 AC-03): el módulo NO expone ningún handler de mutación
// nuevo. Los rejectWrite del baseline US-016 se preservan para facilitar tests negativos
// sin romper la suite legada.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { AdminEventIdParamSchema } from '../dto/admin-event-id.param.js';
import { AdminEventsQuerySchema } from './admin-events-query.dto.js';
import { PrismaAdminEventRepository } from '../infrastructure/prisma-admin-event.repository.js';
import { PrismaAdminActionRepository } from '../infrastructure/prisma-admin-action.repository.js';
import { StructuredAdminAuditLogger } from '../infrastructure/structured-admin-audit-logger.js';
import { AdminViewEventUseCase } from '../application/admin-view-event.use-case.js';
import { ListEventsForAdminUseCase } from '../application/list-events-for-admin.use-case.js';
import { AdminEventsController } from './admin-events.controller.js';

const adminEventRepo = new PrismaAdminEventRepository();
const adminActionRepo = new PrismaAdminActionRepository();
const auditLogger = new StructuredAdminAuditLogger();
const viewEvent = new AdminViewEventUseCase(adminEventRepo, adminActionRepo);
const listEvents = new ListEventsForAdminUseCase();

const controller = new AdminEventsController({ viewEvent, listEvents, auditLogger });

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const adminOnly = roleMiddleware(['admin']);

export const adminEventsRouter = Router();

// Guards comunes: sesión válida + rol admin ANTES de validación.
adminEventsRouter.use(sessionAuth, adminOnly);

// US-078: listado paginado. Se registra ANTES de `/:id` para preservar orden de match
// (paridad exacta con `adminVendorRouter` de US-074).
adminEventsRouter.get(
  '/',
  validateRequestMiddleware(z.object({ query: AdminEventsQuerySchema })),
  asyncHandler(controller.list),
);

adminEventsRouter.get(
  '/:id',
  validateRequestMiddleware(z.object({ params: AdminEventIdParamSchema })),
  asyncHandler(controller.show),
);

// BE-005 / AC-02: handlers explícitos por método para facilitar tests negativos (NT-03, NT-04).
adminEventsRouter.patch('/:id', controller.rejectWrite);
adminEventsRouter.delete('/:id', controller.rejectWrite);
adminEventsRouter.post('/:id', controller.rejectWrite);
adminEventsRouter.post('/:id/cancel', controller.rejectWrite);
