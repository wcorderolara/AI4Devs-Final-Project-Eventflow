// Tipos DTO (US-043 / PB-P1-026 / FE-003). Alineados con el contrato del §9 API Contract.

export interface AttachmentDimensionsDTO {
  width: number;
  height: number;
}

export interface UploadPortfolioImageResponseDTO {
  id: string;
  owner_type: 'vendor_work';
  owner_id: string;
  work_label: string;
  mime: string;
  size_bytes: number;
  storage_url: string;
  status: 'active';
  created_at: string;
  dimensions: AttachmentDimensionsDTO;
}

export interface UploadPortfolioImageEnvelopeDTO {
  data: UploadPortfolioImageResponseDTO;
  correlationId: string;
}

export interface UploadPortfolioImageInput {
  workLabel: string;
  file: File;
}

/**
 * Modelo de dominio para la vista (post-normalización). El frontend nunca expone `storage_url`
 * directamente; el thumbnail se resuelve vía id + endpoint autenticado en US futura.
 */
export interface PortfolioImageView {
  id: string;
  workLabel: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
  dimensions: AttachmentDimensionsDTO;
}

export function toPortfolioImageView(dto: UploadPortfolioImageResponseDTO): PortfolioImageView {
  return {
    id: dto.id,
    workLabel: dto.work_label,
    mime: dto.mime,
    sizeBytes: dto.size_bytes,
    createdAt: dto.created_at,
    dimensions: dto.dimensions,
  };
}

// US-048 (PB-P1-026 / FE-002): soft delete del attachment. Response 204 (sin body). Body de
// request opcional con `deletion_reason` (1..500 chars enforced en backend).
export interface DeletePortfolioImageInput {
  imageId: string;
  deletionReason?: string;
}
