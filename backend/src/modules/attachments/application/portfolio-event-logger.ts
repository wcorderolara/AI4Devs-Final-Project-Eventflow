// Logger de eventos del portafolio del vendor (US-043 / PB-P1-026 / BE-008).
// SOLO metadatos seguros: vendor_profile_id, vendor_user_id opaco, work_label, attachment_id,
// mime, size_bytes, dimensions, correlation_id, code (en failed). NUNCA binario, filename ni PII.
//
// El upload_failed reporta el `phase` para observabilidad (validation/storage/db/pipeline).

export const VENDOR_PORTFOLIO_UPLOADED_EVENT = 'vendor.portfolio.uploaded';
export const VENDOR_PORTFOLIO_UPLOAD_FAILED_EVENT = 'vendor.portfolio.upload_failed';

export type UploadFailedPhase = 'validation' | 'pipeline' | 'storage' | 'db' | 'unknown';

export interface PortfolioUploadedContext {
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  workLabel: string;
  attachmentId: string;
  mime: string;
  sizeBytes: number;
  dimensions: { width: number; height: number };
  durationMs?: number;
}

export interface PortfolioUploadFailedContext {
  correlationId?: string;
  vendorProfileId?: string;
  vendorUserId: string;
  workLabel?: string;
  phase: UploadFailedPhase;
  code: string;
  message?: string;
}

export interface PortfolioUploadedPayload {
  event: typeof VENDOR_PORTFOLIO_UPLOADED_EVENT;
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  workLabel: string;
  attachmentId: string;
  mime: string;
  sizeBytes: number;
  dimensions: { width: number; height: number };
  durationMs?: number;
}

export function buildPortfolioUploadedPayload(
  ctx: PortfolioUploadedContext,
): PortfolioUploadedPayload {
  return {
    event: VENDOR_PORTFOLIO_UPLOADED_EVENT,
    correlationId: ctx.correlationId,
    vendorProfileId: ctx.vendorProfileId,
    vendorUserId: ctx.vendorUserId,
    workLabel: ctx.workLabel,
    attachmentId: ctx.attachmentId,
    mime: ctx.mime,
    sizeBytes: ctx.sizeBytes,
    dimensions: ctx.dimensions,
    durationMs: ctx.durationMs,
  };
}

export interface PortfolioUploadFailedPayload {
  event: typeof VENDOR_PORTFOLIO_UPLOAD_FAILED_EVENT;
  correlationId?: string;
  vendorProfileId?: string;
  vendorUserId: string;
  workLabel?: string;
  phase: UploadFailedPhase;
  code: string;
  message?: string;
}

export function buildPortfolioUploadFailedPayload(
  ctx: PortfolioUploadFailedContext,
): PortfolioUploadFailedPayload {
  return {
    event: VENDOR_PORTFOLIO_UPLOAD_FAILED_EVENT,
    correlationId: ctx.correlationId,
    vendorProfileId: ctx.vendorProfileId,
    vendorUserId: ctx.vendorUserId,
    workLabel: ctx.workLabel,
    phase: ctx.phase,
    code: ctx.code,
    message: ctx.message,
  };
}

export interface PortfolioEventLogger {
  emitUploaded(ctx: PortfolioUploadedContext): void;
  emitUploadFailed(ctx: PortfolioUploadFailedContext): void;
}
