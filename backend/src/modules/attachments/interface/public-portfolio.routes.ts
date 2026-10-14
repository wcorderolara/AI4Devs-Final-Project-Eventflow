// Ruta pública de imágenes de portafolio:
//
//   GET /api/v1/public/portfolio/:imageId → binario de la imagen.
//
// Sirve las fotos que el perfil público (US-046) ya expone como parte del portafolio. Sólo
// trabajos activos de proveedores aprobados y visibles; lo demás es 404 uniforme. El archivo se
// lee de `FILE_STORAGE_PATH` con `sendFile({ root })`, que impide salir de esa carpeta.
// Cada imagen es inmutable por su id, así que la caché del navegador puede ser larga.
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { config } from '../../../config/env.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { GetPublicPortfolioImageUseCase } from '../application/get-public-portfolio-image.use-case.js';
import { AttachmentNotFoundError } from '../domain/attachment.errors.js';
import { PrismaPublicPortfolioImageReader } from '../infrastructure/prisma-attachment.repository.js';
import { ImageIdParamSchema } from './dto/soft-delete-portfolio-image.request.js';

const useCase = new GetPublicPortfolioImageUseCase(new PrismaPublicPortfolioImageReader());

export const publicPortfolioRouter = Router();

publicPortfolioRouter.get(
  '/:imageId',
  validateRequestMiddleware(z.object({ params: ImageIdParamSchema })),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const image = await useCase.execute(String(req.params.imageId));
    res.sendFile(
      image.storageUrl,
      {
        root: config.FILE_STORAGE_PATH,
        dotfiles: 'deny',
        headers: {
          'Content-Type': image.mimeType,
          'Cache-Control': 'public, max-age=604800, immutable',
          'X-Content-Type-Options': 'nosniff',
        },
      },
      // Registro sin binario en disco (o ruta inválida): mismo 404 uniforme.
      (err) => {
        if (err && !res.headersSent) next(new AttachmentNotFoundError());
      },
    );
  }),
);
