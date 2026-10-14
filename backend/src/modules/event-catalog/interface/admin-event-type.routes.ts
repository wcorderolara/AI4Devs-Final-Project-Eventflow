// Rutas Admin EventType (US-076 / BE-007). Registra los 4 endpoints admin comunes de
// catálogos bajo `/api/v1/admin/event-types` (ver `createCatalogAdminRouter`):
//
//   GET    /                 → listado plano (incluye `is_active=false`)
//   POST   /                 → crear EventType (AC-01)
//   PATCH  /:id              → update / reactivate (AC-02)
//   DELETE /:id              → soft delete con reason (AC-03)
import { createCatalogAdminRouter } from '../../../shared/interface/http/catalog-admin.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { CreateEventTypeUseCase } from '../application/create-event-type.use-case.js';
import { UpdateEventTypeUseCase } from '../application/update-event-type.use-case.js';
import { SoftDeleteEventTypeUseCase } from '../application/soft-delete-event-type.use-case.js';
import { ListEventTypesUseCase } from '../application/list-event-types.use-case.js';
import {
  CreateEventTypeBodySchema,
  DeleteEventTypeBodySchema,
  EventTypeIdParamsSchema,
  UpdateEventTypeBodySchema,
} from './event-type.dto.js';

// Composition root del sub-módulo. Reusa clock/sessionRepo global + un logger dedicado.
const logger = new StructuredDomainEventLogger();

export const adminEventTypeRouter = createCatalogAdminRouter(
  {
    create: new CreateEventTypeUseCase(logger, prisma),
    update: new UpdateEventTypeUseCase(logger, prisma),
    softDelete: new SoftDeleteEventTypeUseCase(logger, prisma),
    list: new ListEventTypesUseCase(prisma),
  },
  {
    idParams: EventTypeIdParamsSchema,
    createBody: CreateEventTypeBodySchema,
    updateBody: UpdateEventTypeBodySchema,
    deleteBody: DeleteEventTypeBodySchema,
  },
);
