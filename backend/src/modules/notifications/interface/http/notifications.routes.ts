// US-071 (PB-P2-004 / BE-005). Router del surface de notificaciones.
// Endpoints canónicos (`docs/16 §34.2`):
//   * `GET  /api/v1/notifications`                            → US-071 listado.
//   * `PATCH /api/v1/notifications/:notificationId/read`      → US-072 single mark.
//   * `POST  /api/v1/notifications/mark-all-read`             → US-072 bulk mark.
//
// Composición canónica US-111: `sessionAuth → controller`. El middleware
// `sessionAuth` rechaza sin cookie válida con 401 (AC-03). El aislamiento
// BR-NOTIF-005 se ejerce dentro de cada use case (`WHERE user_id = session.userId`)
// — cualquier rol autenticado ve/muta sólo sus notifs.
import { Router } from 'express';
import { z } from 'zod';
import { createSessionAuthMiddleware } from '../../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../../shared/interface/http/async-handler.js';
import { validateRequestMiddleware } from '../../../../shared/interface/middlewares/validate-request.middleware.js';
import { sessionRepository, clock } from '../../../../infrastructure/auth-composition.js';
import { logger as sharedLogger } from '../../../../shared/infrastructure/logger/index.js';
import { ListMyNotificationsUseCase } from '../../application/list-my-notifications.use-case.js';
import { MarkNotificationAsReadUseCase } from '../../application/mark-notification-as-read.use-case.js';
import { MarkAllNotificationsAsReadUseCase } from '../../application/mark-all-notifications-as-read.use-case.js';
import { BatchNotificationLinkResolver } from '../../application/notification-link-resolver.service.js';
import { PrismaListNotificationsRepository } from '../../infrastructure/prisma-list-notifications.repository.js';
import { PrismaMarkNotificationsRepository } from '../../infrastructure/prisma-mark-notifications.repository.js';
import { PrismaNotificationLinkEventReader } from '../../infrastructure/prisma-notification-link-event-reader.js';
import { PrismaNotificationLinkQuoteRequestReader } from '../../infrastructure/prisma-notification-link-quote-request-reader.js';
// US-070 (PB-P2-007 / BE-002): batch-lookup contra `booking_intents` para la
// estrategia `booking_confirmed` con dispatch por rol.
import { PrismaNotificationLinkBookingIntentReader } from '../../infrastructure/prisma-notification-link-booking-intent-reader.js';
// US-072 (PB-P2-008 / BE-001): schemas Zod para path + query params. Se aplican
// via `validateRequestMiddleware` para que los errores se mapeen a
// `400 VALIDATION_FAILED` — mismo patrón que el resto del repositorio.
import {
  markAllReadQuerySchema,
  notificationIdParamSchema,
} from './mark-notifications.schemas.js';
import { NotificationsController } from './notifications.controller.js';

const listRepository = new PrismaListNotificationsRepository();
const markRepository = new PrismaMarkNotificationsRepository();
const linkResolver = new BatchNotificationLinkResolver({
  eventReader: new PrismaNotificationLinkEventReader(),
  quoteRequestReader: new PrismaNotificationLinkQuoteRequestReader(),
  bookingIntentReader: new PrismaNotificationLinkBookingIntentReader(),
});

const listUseCase = new ListMyNotificationsUseCase({ repo: listRepository, linkResolver });
const markAsReadUseCase = new MarkNotificationAsReadUseCase(markRepository);
const markAllAsReadUseCase = new MarkAllNotificationsAsReadUseCase({
  repo: markRepository,
  logger: sharedLogger,
});

const controller = new NotificationsController({
  list: listUseCase,
  markAsRead: markAsReadUseCase,
  markAllAsRead: markAllAsReadUseCase,
});

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });

export const notificationsRouter = Router();

notificationsRouter.get('/notifications', sessionAuth, asyncHandler(controller.list));
// US-072 (PB-P2-008 / BE-005): mutations con response `204 No Content`. Zod se
// aplica ANTES del controller para que payloads inválidos disparen 400 uniforme
// vía `ValidationError` en vez de `ZodError` colapsando a 500.
notificationsRouter.patch(
  '/notifications/:notificationId/read',
  sessionAuth,
  validateRequestMiddleware(z.object({ params: notificationIdParamSchema })),
  asyncHandler(controller.markAsRead),
);
notificationsRouter.post(
  '/notifications/mark-all-read',
  sessionAuth,
  validateRequestMiddleware(z.object({ query: markAllReadQuerySchema })),
  asyncHandler(controller.markAllAsRead),
);
