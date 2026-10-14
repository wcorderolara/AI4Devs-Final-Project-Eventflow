// Imagen pública del portafolio de un proveedor (perfil público, US-046). Sólo se sirve si el
// trabajo y el proveedor son visibles; cualquier otro caso es un 404 uniforme que no revela si
// la imagen existe.
import { AttachmentNotFoundError } from '../domain/attachment.errors.js';
import type { PublicPortfolioImage, PublicPortfolioImageReader } from '../ports/attachment.repository.js';

export class GetPublicPortfolioImageUseCase {
  constructor(private readonly reader: PublicPortfolioImageReader) {}

  async execute(attachmentId: string): Promise<PublicPortfolioImage> {
    const image = await this.reader.findVisibleById(attachmentId);
    if (!image) throw new AttachmentNotFoundError();
    return image;
  }
}
