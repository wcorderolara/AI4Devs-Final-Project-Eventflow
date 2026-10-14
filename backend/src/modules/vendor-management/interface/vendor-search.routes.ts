// Rutas — Directorio autenticado (US-045 / BE-005). Monta `GET /api/v1/vendors`.
// Auth: cookie de sesión firmada + `authenticatedGuard` (organizer/vendor/admin). Sin sesión
// → 401 canónico. Vendor autenticado se excluye de sus propios resultados (SEC-03) en el use
// case. Debe montarse ANTES de `vendorProfileRouter` para no colisionar (aunque el prefijo
// exacto es distinto: `vendorProfileRouter` cubre `/vendors/me`).
import { Router } from 'express';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { requireSession, requireRole } from '../../../infrastructure/auth-composition.js';
import { z } from 'zod';
import { SearchVendorsUseCase } from '../application/search-vendors.use-case.js';
import { PrismaVendorSearchRepository } from '../infrastructure/prisma-vendor-search.repository.js';
import {
  PrismaLocationSlugResolver,
  PrismaServiceCategorySlugResolver,
} from '../infrastructure/prisma-vendor-search-resolvers.js';
import { VendorSearchController } from './vendor-search.controller.js';
import { SearchVendorsQuerySchema } from './dto/search-vendors.query.js';

const repository = new PrismaVendorSearchRepository();
const categoryResolver = new PrismaServiceCategorySlugResolver();
const locationResolver = new PrismaLocationSlugResolver();
const useCase = new SearchVendorsUseCase(repository, categoryResolver, locationResolver);
const controller = new VendorSearchController(useCase);

export const vendorSearchRouter = Router();

vendorSearchRouter.get(
  '/',
  requireSession,
  requireRole('organizer', 'vendor', 'admin'),
  validateRequestMiddleware(z.object({ query: SearchVendorsQuerySchema })),
  asyncHandler(controller.search),
);
