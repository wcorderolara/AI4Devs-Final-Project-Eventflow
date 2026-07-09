// fileUploadMiddleware (US-091 / BE-010, Por ruta — multipart). MIME allow-list genérica +
// size limit configurable (`FILE_SIZE_LIMIT`). Los MIME types específicos por flujo (portafolio
// vendor, brief de quote) se configuran en las feature stories de attachments.
import multer, { type FileFilterCallback } from 'multer';
import type { Request, RequestHandler } from 'express';
import { config } from '../../../config/env.js';
import { BadRequestError } from '../../domain/errors/bad-request.error.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

function fileFilter(_req: Request, file: Express.Multer.File, callback: FileFilterCallback): void {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(null, true);
    return;
  }
  callback(new BadRequestError('Invalid file type or size'));
}

export const fileUploadMiddleware: RequestHandler = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.FILE_SIZE_LIMIT },
  fileFilter,
}).single('file');
