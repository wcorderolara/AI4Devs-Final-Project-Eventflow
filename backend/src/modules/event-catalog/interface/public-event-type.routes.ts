// Ruta pública EventType (US-076 / BE-007).
//
//   GET /api/v1/event-types → `EventTypeView[]` filtrado a `is_active=true`.
//
// Sustituye al `eventTypesRouter` de US-009 en `event-planning/interface/catalog.routes.ts`
// — el shape ahora es un superset (`EventTypeView[]` con `name_i18n`, `sort_order`,
// `is_active`) en lugar del array plano `{code, label}[]` previo. Backward-compatible:
// el caller `web/src/features/events/api/eventsApi.ts` proyecta solo `{code, label}` de
// cada elemento y sigue funcionando.
//
// Auth: `sessionAuth` — cualquier rol autenticado (Decisión PO D8 / SEC-02). Sin
// `roleMiddleware` (no es admin-only).
import { Router } from 'express';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { ListEventTypesUseCase } from '../application/list-event-types.use-case.js';
import { PublicEventTypeController } from './public-event-type.controller.js';

const listUC = new ListEventTypesUseCase(prisma);
const controller = new PublicEventTypeController(listUC);
const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });

export const publicEventTypeRouter = Router();
publicEventTypeRouter.get('/', sessionAuth, asyncHandler(controller.list));

export const publicEventTypeComposition = { listUC, controller } as const;
