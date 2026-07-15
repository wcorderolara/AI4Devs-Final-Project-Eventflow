// Rutas de booking-intent (US-096 / API-001, SEC). Doc 16 bajo `/api/v1/booking-intents`.
// Auth por ruta: create/cancel organizer o vendor asignado; confirm solo vendor asignado.
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
import { PrismaQuoteContextReader } from '../infrastructure/prisma-quote-context.reader.js';
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
  CreateBookingIntentUseCase,
  GetBookingIntentUseCase,
  ConfirmBookingIntentUseCase,
  CancelBookingIntentUseCase,
} from '../application/booking-intent.use-cases.js';
import { BookingIntentsController } from './booking-intent.controller.js';

const events = new PrismaEventAccessReader();
const vendors = new PrismaVendorProfileReader();
const logger = new StructuredDomainEventLogger();
const bookingIntents = new PrismaBookingIntentRepository();
const quoteContext = new PrismaQuoteContextReader();

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
  create: new CreateBookingIntentUseCase(bookingIntents, quoteContext, events, clock, logger),
  get: new GetBookingIntentUseCase(bookingIntents, events, vendors),
  confirm: new ConfirmBookingIntentUseCase(bookingIntents, vendors, clock, logger, {
    budgetSync: budgetSyncAdapter,
    transactionRunner,
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
