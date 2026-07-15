// Errores de dominio del bounded context `attachments` (US-043 / PB-P1-026).
// Extienden `AppError` para consumir el mapping HTTP del `errorHandlerMiddleware` (US-093 / BE-006).
// Los códigos viven en `ErrorCodes` para reuso por MSW y agentes IA.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/** EC-01, NT-07 — header MIME o magic-bytes fuera del allowlist. → 400 INVALID_MIME. */
export class InvalidMimeError extends AppError {
  readonly code = ErrorCodes.INVALID_MIME;

  constructor(message = 'File MIME type is not allowed') {
    super(message);
  }
}

/** Falla del decoder `sharp` — binario corrupto o formato no reconocido. → 400 INVALID_IMAGE. */
export class InvalidImageError extends AppError {
  readonly code = ErrorCodes.INVALID_IMAGE;

  constructor(message = 'The uploaded image could not be processed') {
    super(message);
  }
}

/** EC-05 — path param `:workLabel` no matchea el regex D5. → 400 INVALID_WORK_LABEL. */
export class InvalidWorkLabelError extends AppError {
  readonly code = ErrorCodes.INVALID_WORK_LABEL;

  constructor(message = 'The work_label is invalid') {
    super(message);
  }
}

/** AC-02 — 10 imágenes activas en el mismo `(owner_id, LOWER(work_label))`. → 409. */
export class ImageLimitReachedError extends AppError {
  readonly code = ErrorCodes.IMAGE_LIMIT_REACHED;

  constructor(message = 'Reached the limit of 10 active images for this work_label') {
    super(message);
  }
}

/** EC-06 / D6 — 20 `work_labels` activos distintos por vendor. → 409. */
export class WorkLabelLimitReachedError extends AppError {
  readonly code = ErrorCodes.WORK_LABEL_LIMIT_REACHED;

  constructor(message = 'Reached the limit of 20 distinct work_labels') {
    super(message);
  }
}

/** EC-02 — multer rechaza binario > FILE_SIZE_LIMIT. → 413. */
export class FileTooLargeError extends AppError {
  readonly code = ErrorCodes.FILE_TOO_LARGE;

  constructor(message = 'File exceeds the maximum allowed size') {
    super(message);
  }
}

/**
 * EC-04 — vendor autenticado sin `VendorProfile` activo (o soft-deleted). → 404 PROFILE_NOT_FOUND.
 * Se declara local al módulo `attachments` para respetar ADR-ARCH-001 (no importar clases de
 * `vendor-management`). Comparte el mismo `code` estable del catálogo con `VendorProfileNotFoundError`.
 */
export class PortfolioProfileNotFoundError extends AppError {
  readonly code = ErrorCodes.PROFILE_NOT_FOUND;

  constructor(message = 'Vendor profile not found') {
    super(message);
  }
}

/**
 * EC-03 — `status='hidden'` bloquea uploads. → 409 PROFILE_HIDDEN. Local al módulo por la
 * misma razón que `PortfolioProfileNotFoundError`.
 */
export class PortfolioProfileHiddenError extends AppError {
  readonly code = ErrorCodes.PROFILE_HIDDEN;

  constructor(message = 'Vendor profile is hidden by an administrator') {
    super(message);
  }
}
