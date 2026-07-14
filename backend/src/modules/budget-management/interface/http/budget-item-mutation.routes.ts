// US-036 (PB-P1-020 / BE-007, R1) — Router de mutaciones sobre BudgetItem.
// Endpoints canónicos (Tech Spec §9):
//   POST   /api/v1/events/:eventId/budget/items
//   PATCH  /api/v1/events/:eventId/budget/items/:itemId
//   DELETE /api/v1/events/:eventId/budget/items/:itemId
// Se monta ANTES de `eventPlanningRouter` (patrón US-027/US-035) para evitar colisión con
// catch-alls de `/events/*`.
// Composición canónica US-111: `sessionAuth → roleMiddleware(['organizer']) → asyncHandler`.
// Vendor/admin → 403 antes del handler. Ownership + no-revelación 404 los aplica el use case.
import { Router } from 'express';
import { roleMiddleware } from '../../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../../infrastructure/auth-composition.js';
import { PrismaBudgetItemWriteRepository } from '../../infrastructure/prisma-budget-item-write.repository.js';
import { PrismaEventBudgetContextReader } from '../../infrastructure/prisma-event-budget-context.reader.js';
import { PrismaServiceCategoryReadAdapter } from '../../infrastructure/prisma-service-category-read.adapter.js';
import { PrismaBookingIntentReadAdapter } from '../../infrastructure/prisma-booking-intent-read.adapter.js';
import { CreateBudgetItemUseCase } from '../../application/create-budget-item.use-case.js';
import { UpdateBudgetItemUseCase } from '../../application/update-budget-item.use-case.js';
import { DeleteBudgetItemUseCase } from '../../application/delete-budget-item.use-case.js';
import { BudgetItemTelemetry } from '../../application/budget-item-telemetry.js';
import { BudgetItemMutationController } from './budget-item-mutation.controller.js';

const writeRepo = new PrismaBudgetItemWriteRepository();
const eventContextReader = new PrismaEventBudgetContextReader();
const serviceCategoryReader = new PrismaServiceCategoryReadAdapter();
const bookingIntentReader = new PrismaBookingIntentReadAdapter();
const telemetry = new BudgetItemTelemetry();

const createUseCase = new CreateBudgetItemUseCase(
  eventContextReader,
  serviceCategoryReader,
  writeRepo,
  telemetry,
);
const updateUseCase = new UpdateBudgetItemUseCase(
  eventContextReader,
  serviceCategoryReader,
  writeRepo,
  telemetry,
);
const deleteUseCase = new DeleteBudgetItemUseCase(
  eventContextReader,
  serviceCategoryReader,
  bookingIntentReader,
  writeRepo,
  telemetry,
);

const controller = new BudgetItemMutationController(createUseCase, updateUseCase, deleteUseCase);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizerOnly = roleMiddleware(['organizer']);

export const budgetItemMutationRouter = Router();

budgetItemMutationRouter.post(
  '/events/:eventId/budget/items',
  sessionAuth,
  organizerOnly,
  asyncHandler(controller.create),
);
budgetItemMutationRouter.patch(
  '/events/:eventId/budget/items/:itemId',
  sessionAuth,
  organizerOnly,
  asyncHandler(controller.update),
);
budgetItemMutationRouter.delete(
  '/events/:eventId/budget/items/:itemId',
  sessionAuth,
  organizerOnly,
  asyncHandler(controller.delete),
);
