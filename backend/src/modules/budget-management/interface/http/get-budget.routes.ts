// US-035 (PB-P1-020 / BE-004, R1) — Router de la vista del presupuesto.
// Endpoint canónico: `GET /api/v1/events/:eventId/budget` (Tech Spec §9). Se monta en `app.ts`
// bajo `/api/v1` ANTES de `eventPlanningRouter` para capturar `/events/:eventId/budget` sin
// colisionar con el resto de rutas de eventos (patrón US-031 / US-097 / US-027).
//
// Composición canónica US-111: `auth → role → handler`. Path param validado en el controller
// con Zod. Sin body ni query params (VR-04).
//
// SEC-01/02/03/04: `roleMiddleware(['organizer'])` rechaza vendor y admin con 403 ANTES del
// handler. Masked 404 (SEC-06 / AUTH-TS-02) se resuelve en el use case vía `isOwnedEvent`.
import { Router } from 'express';
import { roleMiddleware } from '../../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../../infrastructure/auth-composition.js';
import { GetBudgetUseCase } from '../../application/get-budget.use-case.js';
import { GetBudgetTelemetry } from '../../application/get-budget-telemetry.js';
import { PrismaBudgetReadRepository } from '../../infrastructure/prisma-budget-read.repository.js';
// US-038 (PB-P1-022 / BE-002): adapter estático de `CurrencyReadPort`. Cuando la tabla
// `Currency` con `decimal_places` exista, se sustituye por el adapter Prisma sin tocar el
// use case ni el port.
import { StaticCurrencyReadAdapter } from '../../infrastructure/static-currency-read.adapter.js';
import { GetBudgetController } from './get-budget.controller.js';

const repository = new PrismaBudgetReadRepository();
const currencyReader = new StaticCurrencyReadAdapter();
const telemetry = new GetBudgetTelemetry();
const useCase = new GetBudgetUseCase(repository, currencyReader, telemetry);
const controller = new GetBudgetController(useCase);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizerOnly = roleMiddleware(['organizer']);

export const budgetRouter = Router();

budgetRouter.get(
  '/events/:eventId/budget',
  sessionAuth,
  organizerOnly,
  asyncHandler(controller.handle),
);
