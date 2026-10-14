// Rutas Admin ServiceCategory (US-075 / BE-007). Registra los 4 endpoints admin comunes de
// catálogos bajo `/api/v1/admin/service-categories` (ver `createCatalogAdminRouter`):
//
//   GET    /                 → listado tree + flat (incluye `is_active=false`)
//   POST   /                 → crear categoría root o child (AC-01/AC-02)
//   PATCH  /:id              → update / reactivate (AC-03)
//   DELETE /:id              → soft delete con reason (AC-04)
import { createCatalogAdminRouter } from '../../../shared/interface/http/catalog-admin.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { CreateServiceCategoryUseCase } from '../application/create-service-category.use-case.js';
import { UpdateServiceCategoryUseCase } from '../application/update-service-category.use-case.js';
import { SoftDeleteServiceCategoryUseCase } from '../application/soft-delete-service-category.use-case.js';
import { ListServiceCategoriesUseCase } from '../application/list-service-categories.use-case.js';
import {
  CreateServiceCategoryBodySchema,
  DeleteServiceCategoryBodySchema,
  ServiceCategoryIdParamsSchema,
  UpdateServiceCategoryBodySchema,
} from './service-category.dto.js';

// Composition root del sub-módulo. Reusa clock/sessionRepo global + un logger dedicado.
const logger = new StructuredDomainEventLogger();

export const adminServiceCategoryRouter = createCatalogAdminRouter(
  {
    create: new CreateServiceCategoryUseCase(logger, prisma),
    update: new UpdateServiceCategoryUseCase(logger, prisma),
    softDelete: new SoftDeleteServiceCategoryUseCase(logger, prisma),
    list: new ListServiceCategoriesUseCase(prisma),
  },
  {
    idParams: ServiceCategoryIdParamsSchema,
    createBody: CreateServiceCategoryBodySchema,
    updateBody: UpdateServiceCategoryBodySchema,
    deleteBody: DeleteServiceCategoryBodySchema,
  },
);
