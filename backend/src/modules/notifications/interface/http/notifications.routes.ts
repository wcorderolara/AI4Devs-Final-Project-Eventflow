// US-071 (PB-P2-004 / BE-005). Router del surface de notificaciones.
// Endpoint canónico: `GET /api/v1/notifications` (`docs/16 §34.2`).
//
// Composición canónica US-111: `sessionAuth → controller`.
// El middleware `sessionAuth` rechaza sin cookie válida con 401 (AC-03). El
// aislamiento BR-NOTIF-005 se ejerce dentro del use case (`WHERE user_id =
// session.userId`) — cualquier rol autenticado ve sólo sus notifs (AC-04).
import { Router } from 'express';
import { createSessionAuthMiddleware } from '../../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../../infrastructure/auth-composition.js';
import { ListMyNotificationsUseCase } from '../../application/list-my-notifications.use-case.js';
import { BatchNotificationLinkResolver } from '../../application/notification-link-resolver.service.js';
import { PrismaListNotificationsRepository } from '../../infrastructure/prisma-list-notifications.repository.js';
import { PrismaNotificationLinkEventReader } from '../../infrastructure/prisma-notification-link-event-reader.js';
import { NotificationsController } from './notifications.controller.js';

const repository = new PrismaListNotificationsRepository();
const linkResolver = new BatchNotificationLinkResolver(new PrismaNotificationLinkEventReader());
const useCase = new ListMyNotificationsUseCase({ repo: repository, linkResolver });
const controller = new NotificationsController(useCase);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });

export const notificationsRouter = Router();

notificationsRouter.get('/notifications', sessionAuth, asyncHandler(controller.list));
