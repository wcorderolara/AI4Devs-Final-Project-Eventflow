// Router de endpoints vendor-scoped sobre `QuoteRequest`:
//   - `GET  /api/v1/vendor/quote-requests/:id`               → detalle (US-051, sin side-effect).
//   - `POST /api/v1/vendor/quote-requests/:id/mark-viewed`   → transición idempotente `sent → viewed` (US-051).
//   - `POST /api/v1/vendor/quote-requests/:id/respond`       → respuesta single-shot con Quote + 2 notifications (US-052).
// Pipeline seguro: sessionAuth → vendorRoleGuard → validate → handler.
// Uniformidad SEC (D4 US-051 / DEV-03 US-052): QR inexistente/ajena/vendor hidden ⇒ `404 QR_NOT_FOUND`.
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { PrismaQuoteNotificationSenderAdapter } from '../../../infrastructure/notifications/prisma-quote-notification-sender.adapter.js';
import { PrismaVendorProfileReader } from '../../../infrastructure/readers/prisma-access-readers.js';
import { PrismaQuoteRequestRepository } from '../infrastructure/prisma-quote-request.repository.js';
import { GetVendorQrDetailUs051UseCase } from '../application/get-vendor-qr-detail.us051.use-case.js';
import { MarkVendorQrViewedUs051UseCase } from '../application/mark-vendor-qr-viewed.us051.use-case.js';
import { RespondQuoteRequestUs052UseCase } from '../application/respond-quote-request.us052.use-case.js';
import { toQuoteRequestResponse } from '../dto/quote-request.response.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { us051QrIdParamSchema, type Us051QrIdParam } from '../dto/us051-qr-id.param.js';
import {
  respondQuoteRequestBodySchema,
  type RespondQuoteRequestBody,
} from '../dto/respond-quote.us052.request.js';

// US-051 (BE-001): re-export para compatibilidad con tests y openapi.
export const qrIdParamSchema = us051QrIdParamSchema;
export type QrIdParam = Us051QrIdParam;

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const vendorOnly = roleMiddleware(['vendor']);
const validate = validateRequestMiddleware;

const vendors = new PrismaVendorProfileReader(prisma);
const notifications = new PrismaQuoteNotificationSenderAdapter(prisma);
const logger = new StructuredDomainEventLogger();
const quoteRequests = new PrismaQuoteRequestRepository(prisma);

const getDetailUseCase = new GetVendorQrDetailUs051UseCase(quoteRequests, vendors);
const markViewedUseCase = new MarkVendorQrViewedUs051UseCase(
  vendors,
  notifications,
  clock,
  logger,
  prisma,
);
const respondUseCase = new RespondQuoteRequestUs052UseCase(
  vendors,
  notifications,
  clock,
  logger,
  prisma,
);

async function getDetailHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const { id } = req.validated?.params as QrIdParam;
  const view = await getDetailUseCase.execute(userId, id);
  res.status(200).json(success(toQuoteRequestResponse(view), req.correlationId ?? ''));
}

async function markViewedHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const { id } = req.validated?.params as QrIdParam;
  const view = await markViewedUseCase.execute(userId, id, { correlationId: req.correlationId });
  res.status(200).json(success(toQuoteRequestResponse(view), req.correlationId ?? ''));
}

async function respondHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const { id } = req.validated?.params as QrIdParam;
  const body = req.validated?.body as RespondQuoteRequestBody;
  const view = await respondUseCase.execute(userId, id, body, {
    correlationId: req.correlationId,
  });
  res.status(201).json(success(view, req.correlationId ?? ''));
}

export const us051VendorQuoteRequestsRouter = Router();

us051VendorQuoteRequestsRouter.get(
  '/vendor/quote-requests/:id',
  sessionAuth,
  vendorOnly,
  validate(z.object({ params: qrIdParamSchema })),
  asyncHandler(getDetailHandler),
);

us051VendorQuoteRequestsRouter.post(
  '/vendor/quote-requests/:id/mark-viewed',
  sessionAuth,
  vendorOnly,
  validate(z.object({ params: qrIdParamSchema })),
  asyncHandler(markViewedHandler),
);

// US-052 (PB-P1-031): respuesta single-shot con Quote + 2 notifications atómicas.
us051VendorQuoteRequestsRouter.post(
  '/vendor/quote-requests/:id/respond',
  sessionAuth,
  vendorOnly,
  validate(z.object({ params: qrIdParamSchema, body: respondQuoteRequestBodySchema })),
  asyncHandler(respondHandler),
);
