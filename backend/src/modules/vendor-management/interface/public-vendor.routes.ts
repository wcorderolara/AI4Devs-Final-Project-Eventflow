// Rutas — perfil público SEO del vendor (US-046 / BE-005). Monta `GET /public/vendors/:slug`.
// Endpoint público (sin auth). Aplica un rate limit dedicado (D7 — key
// `public:vendor_profile`, 60 req/min por IP) además del rate limit global laxo montado en
// `app.ts` (§8.2 Doc 14). Cache-Control y success/failure envelopes viven en el controller.
// El schema Zod del path param se valida antes de invocar al controller (BE-001).
import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { failure } from '../../../shared/response/failure.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';
import { GetPublicVendorBySlugUseCase } from '../application/get-public-vendor-by-slug.use-case.js';
import { PrismaPublicVendorRepository } from '../infrastructure/prisma-public-vendor.repository.js';
import { PublicVendorController } from './public-vendor.controller.js';
import { PublicVendorSlugParamSchema } from './dto/public-vendor-slug.param.js';

const repository = new PrismaPublicVendorRepository();
const useCase = new GetPublicVendorBySlugUseCase(repository);
const controller = new PublicVendorController(useCase);

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

publicVendorRouter.get(
  '/:slug',
  publicVendorProfileRateLimit,
  validateRequestMiddleware(z.object({ params: PublicVendorSlugParamSchema })),
  asyncHandler(controller.getBySlug),
);
