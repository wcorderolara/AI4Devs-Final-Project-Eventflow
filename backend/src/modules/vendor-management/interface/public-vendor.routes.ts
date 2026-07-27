// Rutas — superficie pública de vendors. Monta `GET /public/vendors` (directorio) y
// `GET /public/vendors/:slug` (perfil SEO, US-046 / BE-005).
//
// Ambos son públicos (sin auth) y comparten el rate limit dedicado (D7 — key
// `public:vendor_profile`, 60 req/min por IP) además del rate limit global laxo montado en
// `app.ts` (§8.2 Doc 14). Cache-Control y success/failure envelopes viven en los controllers.
// Los schemas Zod se validan antes de invocar al controller (BE-001).
//
// El directorio público reutiliza íntegramente el use case, el repository y los resolvers del
// directorio autenticado (US-045): la definición de «vendor visible» (`approved`, no borrado)
// es una sola. Ver `PublicVendorSearchController` para la justificación de los datos expuestos.
import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { failure } from '../../../shared/response/failure.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';
import { GetPublicVendorBySlugUseCase } from '../application/get-public-vendor-by-slug.use-case.js';
import { SearchVendorsUseCase } from '../application/search-vendors.use-case.js';
import { PrismaPublicVendorRepository } from '../infrastructure/prisma-public-vendor.repository.js';
import { PrismaVendorSearchRepository } from '../infrastructure/prisma-vendor-search.repository.js';
import {
  PrismaLocationSlugResolver,
  PrismaServiceCategorySlugResolver,
} from '../infrastructure/prisma-vendor-search-resolvers.js';
import { PublicVendorController } from './public-vendor.controller.js';
import { PublicVendorSearchController } from './public-vendor-search.controller.js';
import { PublicVendorSlugParamSchema } from './dto/public-vendor-slug.param.js';
import { SearchVendorsQuerySchema } from './dto/search-vendors.query.js';

const repository = new PrismaPublicVendorRepository();
const useCase = new GetPublicVendorBySlugUseCase(repository);
const controller = new PublicVendorController(useCase);

const searchUseCase = new SearchVendorsUseCase(
  new PrismaVendorSearchRepository(),
  new PrismaServiceCategorySlugResolver(),
  new PrismaLocationSlugResolver(),
);
const searchController = new PublicVendorSearchController(searchUseCase);

// Rate limit dedicado (D7). El global (`rateLimitMiddleware`) sigue aplicando encima —
// éste garantiza el techo declarado por AC-05 aun si el global se relaja en el futuro.
const publicVendorProfileRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      failure(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        'Too many requests',
        undefined,
        req.correlationId ?? '',
      ),
    );
  },
});

export const publicVendorRouter = Router();

// Directorio público. Declarado antes que `/:slug` por legibilidad; no colisionan, porque
// `/:slug` exige un segmento y esta ruta casa sólo con el path exacto.
publicVendorRouter.get(
  '/',
  publicVendorProfileRateLimit,
  validateRequestMiddleware(z.object({ query: SearchVendorsQuerySchema })),
  asyncHandler(searchController.search),
);

publicVendorRouter.get(
  '/:slug',
  publicVendorProfileRateLimit,
  validateRequestMiddleware(z.object({ params: PublicVendorSlugParamSchema })),
  asyncHandler(controller.getBySlug),
);
