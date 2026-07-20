// Rutas Reviews (público) — `GET /api/v1/vendors/:id/reviews` (US-066 / BE-003).
// Endpoint público con auth opcional (`optionalSessionAuthMiddleware`) — admin extiende el
// filtro a todos los `status`; anónimo/organizer/vendor sólo ven `published` (D3).
//
// Validación por Zod (path param + query) antes del controller. Errores mapeados:
//   - `400 VALIDATION_ERROR` — pageSize fuera de rango (VR-02), cursor mal formado (Zod-level).
//   - `400 INVALID_UUID` — path `:id` no es UUID válido (VR-01) — reusa el `.uuid()` de Zod que
//     `error-handler.middleware` mapea a `INVALID_UUID` cuando `path.join('.')` termina en `id`.
//   - `400 INVALID_CURSOR` — cursor no decodifica (levantado por el use case, EC-03).
//   - `404 VENDOR_NOT_FOUND` — vendor inexistente o no `approved` (no-admin), levantado por el
//     use case (D5, uniforme).
//
// Composición: el router se monta bajo `/vendors` en `app.ts` con un path relativo `/:id/reviews`.
// Se ubica ANTES del `vendorProfileRouter` para preservar el orden global de captura y no
// interferir con rutas genéricas del módulo `vendor-management`.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { createOptionalSessionAuthMiddleware } from '../../../shared/interface/http/optional-session-auth.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { GetVendorReviewsUseCase } from '../application/get-vendor-reviews.use-case.js';
import { VendorReviewsController } from './vendor-reviews.controller.js';
import {
  VendorIdParamSchema,
  ListVendorReviewsQuerySchema,
} from './list-vendor-reviews.dto.js';

// Composition root del sub-módulo Reviews-listing (US-066). Comparte el `PrismaClient`
// centralizado y las mismas dependencias de auth que el resto del pipeline.
const useCase = new GetVendorReviewsUseCase(prisma);
const controller = new VendorReviewsController(useCase);

const optionalSessionAuth = createOptionalSessionAuthMiddleware({
  sessions: sessionRepository,
  clock,
});

export const vendorReviewsRouter = Router({ mergeParams: true });

vendorReviewsRouter.get(
  '/:id/reviews',
  optionalSessionAuth,
  validateRequestMiddleware(
    z.object({
      params: VendorIdParamSchema,
      query: ListVendorReviewsQuerySchema,
    }),
  ),
  asyncHandler(controller.list),
);
