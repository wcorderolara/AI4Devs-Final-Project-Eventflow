// Rutas de booking-intent — Doc 16 §M07 bajo `/api/v1/booking-intents`.
// Auth POR RUTA:
//   - `POST /`                       — organizer (US-060 crea atómicamente aceptando la Quote).
//   - `GET /:id`                     — organizer o vendor asignado (US-096 lectura).
//   - `POST /:id/confirm`            — sólo vendor asignado (US-096 confirmación).
//   - `POST /:id/cancel`             — organizer o vendor asignado (US-096 cancelación).
//
// US-060 (PB-P1-036 / BE-004): reemplaza el wiring de `CreateBookingIntentUseCase` (US-096) por
// `CreateBookingIntentUs060UseCase` transaccional (DEV-03 del execution record). El controller
// se mantiene delgado.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import {
  PrismaEventAccessReader,
  PrismaVendorProfileReader,
} from '../../../infrastructure/readers/prisma-access-readers.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { PrismaBookingIntentRepository } from '../infrastructure/prisma-booking-intent.repository.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { PrismaBudgetItemWriteRepository } from '../../budget-management/infrastructure/prisma-budget-item-write.repository.js';
import { UpdateCommittedFromBookingIntentUseCase } from '../../budget-management/application/update-committed-from-booking-intent.use-case.js';
import { BudgetCommittedSyncAdapter } from '../../budget-management/infrastructure/budget-committed-sync.adapter.js';
import {
  CreateBookingIntentRequestSchema,
  CancelBookingIntentRequestSchema,
  BookingIntentIdParamSchema,
} from '../dto/index.js';
import {
  GetBookingIntentUseCase,
  ConfirmBookingIntentUseCase,
  CancelBookingIntentUseCase,
} from '../application/booking-intent.use-cases.js';
import { CreateBookingIntentUs060UseCase } from '../application/create-booking-intent.us060.use-case.js';
// US-060 (BE-002): service común extendido con `booking_intent.created`. Reusa el mismo adapter
// Prisma que emite las notificaciones del quote-flow — un fallo revierte la transacción del UC.
import { QuoteEventNotificationService } from '../../quote-flow/services/quote-event-notification.service.js';
import { PrismaQuoteNotificationSenderAdapter } from '../../../infrastructure/notifications/prisma-quote-notification-sender.adapter.js';
import { BookingIntentsController } from './booking-intent.controller.js';

const events = new PrismaEventAccessReader();
const vendors = new PrismaVendorProfileReader();
const logger = new StructuredDomainEventLogger();
const bookingIntents = new PrismaBookingIntentRepository();

// US-060 (BE-002/003): service común + adapter Prisma para el fan-out `booking_intent.created`.
const notifications = new PrismaQuoteNotificationSenderAdapter(prisma);
const quoteEvents = new QuoteEventNotificationService(notifications, logger);

// US-039: sync `BudgetItem.committed` participando en la tx del confirm/cancel.
const budgetItemWrites = new PrismaBudgetItemWriteRepository();
const budgetSyncAdapter = new BudgetCommittedSyncAdapter(
  new UpdateCommittedFromBookingIntentUseCase(bookingIntents, budgetItemWrites, clock),
);
const transactionRunner = {
  run: <T>(fn: (tx: import('@prisma/client').Prisma.TransactionClient) => Promise<T>): Promise<T> =>
    prisma.$transaction(fn),
};

const controller = new BookingIntentsController({
  create: new CreateBookingIntentUs060UseCase(quoteEvents, clock, logger, prisma),
  get: new GetBookingIntentUseCase(bookingIntents, events, vendors),
  // US-061 (BE-002/003): inyecta el `BookingEventNotifierPort` para emitir 2 notifs al
  // organizer con `event='booking_intent.confirmed'` dentro de la misma tx del `applyOnConfirm`.
  confirm: new ConfirmBookingIntentUseCase(bookingIntents, vendors, clock, logger, {
    budgetSync: budgetSyncAdapter,
    transactionRunner,
    bookingEvents: quoteEvents,
  }),
  cancel: new CancelBookingIntentUseCase(bookingIntents, events, vendors, clock, logger, {
    budgetSync: budgetSyncAdapter,
    transactionRunner,
  }),
});

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizer = roleMiddleware(['organizer']);
const vendor = roleMiddleware(['vendor']);
const organizerOrVendor = roleMiddleware(['organizer', 'vendor']);

export const bookingIntentRouter = Router();

bookingIntentRouter.post(
  '/',
  sessionAuth,
  organizer,
  validateRequestMiddleware(z.object({ body: CreateBookingIntentRequestSchema })),
  asyncHandler(controller.create),
);
bookingIntentRouter.get(
  '/:bookingIntentId',
  sessionAuth,
  organizerOrVendor,
  validateRequestMiddleware(z.object({ params: BookingIntentIdParamSchema })),
  asyncHandler(controller.get),
);
bookingIntentRouter.post(
  '/:bookingIntentId/confirm',
  sessionAuth,
  vendor,
  validateRequestMiddleware(z.object({ params: BookingIntentIdParamSchema })),
  asyncHandler(controller.confirm),
);
bookingIntentRouter.post(
  '/:bookingIntentId/cancel',
  sessionAuth,
  organizerOrVendor,
  validateRequestMiddleware(z.object({ params: BookingIntentIdParamSchema, body: CancelBookingIntentRequestSchema })),
  asyncHandler(controller.cancel),
);
