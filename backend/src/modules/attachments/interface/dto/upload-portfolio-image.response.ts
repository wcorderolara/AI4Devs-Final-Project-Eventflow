// Response DTO — UploadPortfolioImage (US-043 / PB-P1-026 / QA-004 contract).
// Refleja el shape del §9 API Contract. Se expone `attachment_id` como identificador estable;
// el `storage_url` es RELATIVO al `FILE_STORAGE_PATH` — no es una URL descargable. La descarga
// vive en un endpoint autenticado en US futura (SEC-03).
import type { AttachmentView } from '../../domain/attachment.js';

export interface UploadPortfolioImageResponse {
  id: string;
  owner_type: 'vendor_work';
  owner_id: string;
  work_label: string;
  mime: string;
  size_bytes: number;
  storage_url: string;
  status: 'active';
  created_at: string;
  dimensions: { width: number; height: number };
}

export function toUploadPortfolioImageResponse(view: AttachmentView): UploadPortfolioImageResponse {
  return {
    id: view.id,
    owner_type: 'vendor_work',
    owner_id: view.ownerId,
    work_label: view.workLabel,
    mime: view.mime,
    size_bytes: view.sizeBytes,
    storage_url: view.storageUrl,
    status: 'active',
    created_at: view.createdAt.toISOString(),
    dimensions: view.dimensions,
  };
}
