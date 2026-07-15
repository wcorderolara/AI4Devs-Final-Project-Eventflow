// Rutas — Portfolio (US-043 / PB-P1-026 / BE-007).
// Monta `POST /api/v1/vendors/me/portfolio/works/:workLabel/images`.
// Auth: cookie de sesión firmada (US-094) + `roleMiddleware(['vendor'])` (ADR-SEC-003).
// Los rechazos anónimo/organizer/admin (AUTH-TS-06/07 / SEC-01) los emiten estos middlewares canónicos.
import { Router } from 'express';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { portfolioUploadSingle } from './portfolio-upload.middleware.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { config } from '../../../config/env.js';
import { UploadPortfolioImageUseCase } from '../application/upload-portfolio-image.use-case.js';
import { LocalFileStorageAdapter } from '../infrastructure/local-file-storage.adapter.js';
import {
  PrismaAttachmentRepository,
  PrismaVendorProfileForPortfolioReader,
} from '../infrastructure/prisma-attachment.repository.js';
import { StructuredPortfolioEventLogger } from '../infrastructure/structured-portfolio-event-logger.js';
import { PortfolioController } from './portfolio.controller.js';

const attachmentRepository = new PrismaAttachmentRepository();
const vendorReader = new PrismaVendorProfileForPortfolioReader();
const fileStorage = new LocalFileStorageAdapter({
  basePath: config.FILE_STORAGE_PATH,
  now: () => clock.now(),
});
const events = new StructuredPortfolioEventLogger();
const uploadUseCase = new UploadPortfolioImageUseCase(
  attachmentRepository,
  vendorReader,
  fileStorage,
  events,
  clock,
);
const controller = new PortfolioController(uploadUseCase);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const vendorOnly = roleMiddleware(['vendor']);

export const portfolioRouter = Router();

portfolioRouter.post(
  '/works/:workLabel/images',
  sessionAuth,
  vendorOnly,
  portfolioUploadSingle('file'),
  asyncHandler(controller.uploadPortfolioImage),
);
