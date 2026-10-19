// Ruta pública ServiceCategory (US-075 / BE-007).
//
//   GET /api/v1/service-categories → `{tree, flat}` filtrado a `is_active=true`.
//
// Sustituye al endpoint EMERGENT de US-040 en `vendor-management` — el shape ahora es
// `{tree, flat}` (Decisión PO D2) en lugar del array plano previo. El único caller
// (`vendorProfileApi.listServiceCategories`) se actualiza en el frontend para
// consumir `data.flat` con la misma proyección `{id, code, label}`.
//
// Auth: público, sólo lectura (decisión PO 2026-10-14, revisa D10): el directorio público de
// proveedores necesita los nombres de categoría para sus filtros. Es catálogo de referencia sin
// datos personales; la gestión sigue en `/admin/service-categories` (admin-only).
import { Router } from 'express';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { ListServiceCategoriesUseCase } from '../application/list-service-categories.use-case.js';
import { PublicServiceCategoryController } from './public-service-category.controller.js';

const listUC = new ListServiceCategoriesUseCase(prisma);
const controller = new PublicServiceCategoryController(listUC);

export const publicServiceCategoryRouter = Router();
publicServiceCategoryRouter.get('/', asyncHandler(controller.list));
