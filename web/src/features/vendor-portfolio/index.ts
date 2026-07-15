// Barrel público del feature vendor-portfolio (US-043 / PB-P1-026).
export { vendorPortfolioApi } from './api/vendorPortfolioApi';
export {
  toPortfolioImageView,
  type AttachmentDimensionsDTO,
  type PortfolioImageView,
  type UploadPortfolioImageEnvelopeDTO,
  type UploadPortfolioImageInput,
  type UploadPortfolioImageResponseDTO,
} from './api/vendorPortfolioApi.types';
export { PortfolioUploader, type PortfolioUploaderProps } from './components/PortfolioUploader';
export { WorkGrid, type WorkGridProps } from './components/WorkGrid';
export { useUploadPortfolioImage, vendorPortfolioKeys } from './hooks/useUploadPortfolioImage';
