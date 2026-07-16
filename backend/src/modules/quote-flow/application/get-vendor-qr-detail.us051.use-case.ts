// GetVendorQrDetailUseCase (US-051 / BE-004). Tech Spec §7 UseCase. AC-02.
// Lectura sin side-effect del detalle del QuoteRequest para el vendor autenticado.
// Aplica uniformidad SEC (D4): `404 QR_NOT_FOUND` para QR inexistente, ajena, vendor con
// `status='hidden'` o soft-deleted.
import type { QuoteRequestRepository } from '../ports/quote-flow.repositories.js';
import type { VendorProfileReader } from '../../../shared/access/readers.js';
import type { QuoteRequestView } from '../domain/quote-request.js';
import { QrNotFoundError } from '../domain/us052.errors.js';

export class GetVendorQrDetailUs051UseCase {
  constructor(
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly vendors: VendorProfileReader,
  ) {}

  async execute(currentUserId: string, qrId: string): Promise<QuoteRequestView> {
    const vendorProfile = await this.vendors.findActiveByUserId(currentUserId);
    // D4: colapsar "sin perfil / hidden" en `404` uniforme para no filtrar existencia por reflejo.
    if (!vendorProfile || vendorProfile.status === 'hidden') {
      throw new QrNotFoundError('Quote request not found');
    }
    const qr = await this.quoteRequests.findByIdAndVendorProfile(qrId, vendorProfile.id);
    if (!qr) throw new QrNotFoundError('Quote request not found');
    return qr;
  }
}
