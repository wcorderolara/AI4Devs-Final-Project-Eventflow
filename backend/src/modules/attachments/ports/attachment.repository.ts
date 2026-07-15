// Puerto de persistencia del bounded context `attachments` (US-043 / PB-P1-026 / BE-005).
// El adapter concreto vive en `infrastructure/prisma-attachment.repository.ts`.
// Los conteos son case-insensitive (`LOWER(work_label)`); la persistencia preserva el display.
import type { AttachmentView } from '../domain/attachment.js';
import type { AttachmentOwnerType } from '../domain/constants.js';

export interface CreateAttachmentInput {
  id: string;
  ownerType: AttachmentOwnerType;
  ownerId: string;
  workLabel: string;
  mime: string;
  sizeBytes: number;
  storageUrl: string;
  uploadedBy: string;
  dimensions: { width: number; height: number };
}

/**
 * Snapshot del `VendorProfile` requerido por el use case sin acoplarse al aggregate root del
 * bounded context `vendor-management`. El use case sólo lee `id`, `status` y `deletedAt`.
 */
export interface VendorProfileForPortfolio {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  deletedAt: Date | null;
}

export interface VendorProfileForPortfolioReader {
  findActiveByVendorUserId(vendorUserId: string): Promise<VendorProfileForPortfolio | null>;
}

/**
 * Snapshot mínimo del attachment usado por el use case de soft delete (US-048). Se limita a
 * los campos que el use case y el log necesitan; no expone `storage_url` para preservar el
 * boundary con el `FileStoragePort`.
 */
export interface ActiveAttachmentSnapshot {
  id: string;
  ownerId: string;
  workLabel: string;
}

export interface SoftDeleteAttachmentInput {
  id: string;
  ownerId: string;
  deletedBy: string;
  deletionReason: string | null;
}

export interface AttachmentRepository {
  create(input: CreateAttachmentInput): Promise<AttachmentView>;
  /**
   * `true` si existe ≥1 attachment `active` con `owner_id = $1 AND LOWER(work_label) = LOWER($2)
   * AND owner_type = 'vendor_work'`.
   */
  existsActiveByOwnerAndLabel(ownerId: string, workLabel: string): Promise<boolean>;
  /** Conteo case-insensitive del grupo `(owner_id, LOWER(work_label))` — soporta VR-03. */
  countActiveByOwnerAndLabel(ownerId: string, workLabel: string): Promise<number>;
  /** Conteo de `work_labels` distintos (LOWER) activos por vendor — soporta VR-04. */
  countDistinctActiveLabelsByOwner(ownerId: string): Promise<number>;
  /**
   * US-048 (VR-02/VR-03/EC-01). Retorna el snapshot del attachment sólo si es del vendor,
   * `owner_type='vendor_work'` y `status='active'`. `null` cuando no aplica (uniforme a D4).
   */
  findActiveOwnedByIdAndVendor(
    imageId: string,
    ownerId: string,
  ): Promise<ActiveAttachmentSnapshot | null>;
  /**
   * US-048 (AC-01, TOCTOU-safe). Marca soft delete condicional al `WHERE status='active'` —
   * evita el side-effect duplicado en carreras. Retorna `true` si el UPDATE afectó una fila.
   */
  softDeleteByIdOwned(input: SoftDeleteAttachmentInput): Promise<boolean>;
}
