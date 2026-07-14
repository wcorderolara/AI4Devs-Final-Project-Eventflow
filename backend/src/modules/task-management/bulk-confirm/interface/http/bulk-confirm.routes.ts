// US-031 (PB-P1-017 / BE-005) — Router del bulk confirm HITL.
// Endpoint canónico: `POST /api/v1/events/:eventId/tasks/confirm-bulk` (decisión PO PB-P1-017).
// Composición canónica US-111: `auth → role → validation → handler`. No aplica rate limit
// dedicado (no invoca al LLM); usa el rate limit global del middleware pipeline.
import { Router } from 'express';
import { validateRequestMiddleware } from '../../../../../shared/interface/middlewares/validate-request.middleware.js';
import { roleMiddleware } from '../../../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../../../shared/interface/http/async-handler.js';
import { composeProtectedRoute } from '../../../../../shared/interface/http/compose-route.js';
import { sessionRepository, clock } from '../../../../../infrastructure/auth-composition.js';
import { ConfirmAITasksBulkUseCase } from '../../application/confirm-ai-tasks-bulk.use-case.js';
import { BulkConfirmTelemetry } from '../../application/bulk-confirm-telemetry.js';
import { PrismaAITaskBulkRepository } from '../../infrastructure/prisma-ai-task-bulk.repository.js';
import { PrismaOwnedEventMutabilityReader } from '../../infrastructure/prisma-owned-event-mutability.reader.js';
import { ConfirmAITasksBulkController } from './confirm-bulk.controller.js';
import { confirmAITasksBulkRequestSchema } from './confirm-bulk.schema.js';

const repository = new PrismaAITaskBulkRepository();
const eventReader = new PrismaOwnedEventMutabilityReader();
const telemetry = new BulkConfirmTelemetry();
const useCase = new ConfirmAITasksBulkUseCase(repository, eventReader, telemetry);
const controller = new ConfirmAITasksBulkController(useCase);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizerOnly = roleMiddleware(['organizer']);

export const bulkConfirmRouter = Router();

// SEC-02 (`FR-ADMIN-010`): `roleMiddleware(['organizer'])` rechaza admin con 403 FORBIDDEN antes
// de invocar cualquier handler. La no-revelación de eventos ajenos (SEC-04 / EC-02 → 404 global)
// se resuelve en `OwnedEventMutabilityReader.find` (retorna `null` → `NotFoundError` en el use case).
bulkConfirmRouter.post(
  '/events/:eventId/tasks/confirm-bulk',
  ...composeProtectedRoute({
    auth: sessionAuth,
    role: organizerOnly,
    validation: validateRequestMiddleware(confirmAITasksBulkRequestSchema),
    handler: asyncHandler(controller.handle),
  }),
);
