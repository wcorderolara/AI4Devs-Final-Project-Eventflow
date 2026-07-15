// Use case — UploadPortfolioImageUseCase (US-043 / PB-P1-026 / BE-006).
// Flujo autoritativo (Tech Spec §7):
//  1. Resuelve vendor_profile activo por vendor_user_id; null/deleted → 404.
//  2. status='hidden' → 409 PROFILE_HIDDEN.
//  3. Valida MIME header + magic-bytes; inconsistencia → 400 INVALID_MIME.
//  4. Cuenta activos por (owner_id, LOWER(work_label)); >= 10 → 409 IMAGE_LIMIT_REACHED.
//  5. Si el label es nuevo, cuenta distinct(LOWER(work_label)) activos; >= 20 → 409 WORK_LABEL_LIMIT_REACHED.
//  6. Procesa binario con sharp (long-edge 2048, jpeg quality 80); falla → 400 INVALID_IMAGE.
//  7. Escribe binario procesado a `FileStoragePort.save` (path <yyyy>/<mm>/<uuid>.jpg).
//  8. Inserta `attachments(...)` con `uploaded_by = currentUser.id`.
//  9. Si la inserción falla → `fileStoragePort.delete(storageUrl)` (compensación) y re-throw.
// 10. Emite log `vendor.portfolio.uploaded` con correlation_id; en errores 4xx/5xx emite `upload_failed`.
//
// La validación de FORMA (multer size limit, `work_label` regex) vive aguas arriba
// (middleware + Zod path param) — este use case asume input shape válido.
import { randomUUID } from 'node:crypto';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { AttachmentView } from '../domain/attachment.js';
import {
  ImageLimitReachedError,
  InvalidImageError,
  InvalidMimeError,
  PortfolioProfileHiddenError,
  PortfolioProfileNotFoundError,
  WorkLabelLimitReachedError,
} from '../domain/attachment.errors.js';
import {
  MAX_DISTINCT_WORK_LABELS,
  MAX_IMAGES_PER_WORK,
  NORMALIZED_EXTENSION,
  NORMALIZED_MIME,
  OWNER_TYPE_VENDOR_WORK,
} from '../domain/constants.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';
import type {
  AttachmentRepository,
  VendorProfileForPortfolioReader,
} from '../ports/attachment.repository.js';
import type { FileStoragePort } from '../ports/file-storage.port.js';
import { validateImageMagicBytes } from './magic-bytes-validator.js';
import { processImage as defaultProcessImage, type ProcessedImage } from './sharp-pipeline.js';
import type { PortfolioEventLogger, UploadFailedPhase } from './portfolio-event-logger.js';

export interface UploadPortfolioImageCommand {
  vendorUserId: string;
  workLabel: string;
  fileBuffer: Buffer;
  headerMime: string;
}

export interface UploadPortfolioImageContext {
  correlationId?: string;
}

export type ImageProcessor = (buffer: Buffer) => Promise<ProcessedImage>;

export class UploadPortfolioImageUseCase {
  constructor(
    private readonly attachments: AttachmentRepository,
    private readonly vendors: VendorProfileForPortfolioReader,
    private readonly fileStorage: FileStoragePort,
    private readonly events: PortfolioEventLogger,
    private readonly clock: ClockPort,
    private readonly processImage: ImageProcessor = defaultProcessImage,
  ) {}

  async execute(
    cmd: UploadPortfolioImageCommand,
    ctx: UploadPortfolioImageContext = {},
  ): Promise<AttachmentView> {
    const started = this.clock.now().getTime();

    const vendor = await this.vendors.findActiveByVendorUserId(cmd.vendorUserId);
    if (vendor === null) {
      this.emitFailed(cmd, ctx, 'validation', ErrorCodes.PROFILE_NOT_FOUND);
      throw new PortfolioProfileNotFoundError();
    }
    if (vendor.status === 'hidden') {
      this.emitFailed(cmd, ctx, 'validation', ErrorCodes.PROFILE_HIDDEN, vendor.id);
      throw new PortfolioProfileHiddenError();
    }

    const magicCheck = validateImageMagicBytes({
      buffer: cmd.fileBuffer,
      headerMime: cmd.headerMime,
    });
    if (!magicCheck.ok) {
      this.emitFailed(cmd, ctx, 'validation', ErrorCodes.INVALID_MIME, vendor.id);
      throw new InvalidMimeError();
    }

    const existsLabel = await this.attachments.existsActiveByOwnerAndLabel(
      vendor.id,
      cmd.workLabel,
    );
    const countInGroup = await this.attachments.countActiveByOwnerAndLabel(
      vendor.id,
      cmd.workLabel,
    );
    if (countInGroup >= MAX_IMAGES_PER_WORK) {
      this.emitFailed(cmd, ctx, 'validation', ErrorCodes.IMAGE_LIMIT_REACHED, vendor.id);
      throw new ImageLimitReachedError();
    }
    if (!existsLabel) {
      const distinctLabels = await this.attachments.countDistinctActiveLabelsByOwner(vendor.id);
      if (distinctLabels >= MAX_DISTINCT_WORK_LABELS) {
        this.emitFailed(cmd, ctx, 'validation', ErrorCodes.WORK_LABEL_LIMIT_REACHED, vendor.id);
        throw new WorkLabelLimitReachedError();
      }
    }

    let processed: ProcessedImage;
    try {
      processed = await this.processImage(cmd.fileBuffer);
    } catch (err) {
      if (err instanceof InvalidImageError) {
        this.emitFailed(cmd, ctx, 'pipeline', ErrorCodes.INVALID_IMAGE, vendor.id);
        throw err;
      }
      this.emitFailed(cmd, ctx, 'pipeline', ErrorCodes.INTERNAL_ERROR, vendor.id);
      throw err;
    }

    const attachmentId = randomUUID();
    const uuid = randomUUID();
    const { storageUrl } = await this.fileStorage.save({
      buffer: processed.buffer,
      uuid,
      extension: NORMALIZED_EXTENSION,
      mime: NORMALIZED_MIME,
    });

    let created: AttachmentView;
    try {
      created = await this.attachments.create({
        id: attachmentId,
        ownerType: OWNER_TYPE_VENDOR_WORK,
        ownerId: vendor.id,
        workLabel: cmd.workLabel,
        mime: NORMALIZED_MIME,
        sizeBytes: processed.buffer.length,
        storageUrl,
        uploadedBy: cmd.vendorUserId,
        dimensions: { width: processed.width, height: processed.height },
      });
    } catch (err) {
      // Compensación: eliminar el binario recién escrito para evitar orphan files (§17 R3).
      // `delete` es idempotente — un fallo de compensación no debe enmascarar el error original.
      await this.fileStorage.delete(storageUrl).catch(() => {
        /* swallow: se registra en el log del adapter */
      });
      this.emitFailed(cmd, ctx, 'db', ErrorCodes.PERSISTENCE_ERROR, vendor.id);
      throw err;
    }

    this.events.emitUploaded({
      correlationId: ctx.correlationId,
      vendorProfileId: vendor.id,
      vendorUserId: cmd.vendorUserId,
      workLabel: cmd.workLabel,
      attachmentId: created.id,
      mime: created.mime,
      sizeBytes: created.sizeBytes,
      dimensions: created.dimensions,
      durationMs: this.clock.now().getTime() - started,
    });

    return created;
  }

  private emitFailed(
    cmd: UploadPortfolioImageCommand,
    ctx: UploadPortfolioImageContext,
    phase: UploadFailedPhase,
    code: string,
    vendorProfileId?: string,
  ): void {
    this.events.emitUploadFailed({
      correlationId: ctx.correlationId,
      vendorProfileId,
      vendorUserId: cmd.vendorUserId,
      workLabel: cmd.workLabel,
      phase,
      code,
    });
  }
}
