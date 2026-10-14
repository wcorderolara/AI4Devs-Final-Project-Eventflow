// Ruta pública de una imagen de portafolio (`GET /api/v1/public/portfolio/:imageId`). Vive en
// `shared` porque la construyen dos bounded contexts: `vendor-management` (DTOs públicos) y
// `attachments` (que la sirve). Relativa al origen: el web la proxea a la API (`next.config`).
export function publicPortfolioImagePath(attachmentId: string): string {
  return `/api/v1/public/portfolio/${attachmentId}`;
}
