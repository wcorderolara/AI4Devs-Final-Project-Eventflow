// portfolioUploadMiddleware (US-043 / PB-P1-026 / BE-001).
// multer memoryStorage + límite `FILE_SIZE_LIMIT` (5 MB por defecto) + fileFilter estricto
// (image/jpeg | image/png | image/webp). El middleware es sólo la primera trinchera; la
// validación real de magic-bytes vive en el use case (BE-003).
//
// Errores:
// - `LIMIT_FILE_SIZE` (multer) → 413 FILE_TOO_LARGE (`FileTooLargeError`).
// - MIME fuera del allowlist → 400 INVALID_MIME (`InvalidMimeError`).
// - Cualquier otro error de multer → 400 BAD_REQUEST — el mensaje se normaliza para no
//   filtrar detalles internos.
import multer, { type FileFilterCallback, type MulterError } from 'multer';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { config } from '../../../config/env.js';
import { BadRequestError } from '../../../shared/domain/errors/bad-request.error.js';
import { FileTooLargeError, InvalidMimeError } from '../domain/attachment.errors.js';
import { ALLOWED_IMAGE_MIME, type AllowedImageMime } from '../domain/constants.js';

function fileFilter(_req: Request, file: Express.Multer.File, callback: FileFilterCallback): void {
  if (ALLOWED_IMAGE_MIME.includes(file.mimetype as AllowedImageMime)) {
    callback(null, true);
    return;
  }
  callback(new InvalidMimeError());
}

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.FILE_SIZE_LIMIT },
  fileFilter,
});

/**
 * Wrapper del handler `single(fieldName)` de multer que traduce sus errores runtime a la
 * jerarquía de `AppError`. Sin esto, `LIMIT_FILE_SIZE` viaja a `next` como `MulterError` puro
 * y termina como 500 genérico.
 */
export function portfolioUploadSingle(fieldName: string): RequestHandler {
  const handler = uploader.single(fieldName);
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, (err?: unknown) => {
      if (!err) {
        next();
        return;
      }
      if (err instanceof InvalidMimeError) {
        next(err);
        return;
      }
      if (isMulterError(err)) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          next(new FileTooLargeError());
          return;
        }
        next(new BadRequestError('File upload error'));
        return;
      }
      next(err);
    });
  };
}

function isMulterError(err: unknown): err is MulterError {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: string }).name === 'MulterError'
  );
}
