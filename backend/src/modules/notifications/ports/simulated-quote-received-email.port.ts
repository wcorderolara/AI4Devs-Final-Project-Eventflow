// US-069 (PB-P2-006 / BE-004). Puerto `SimulatedQuoteReceivedEmailPort`.
// Paridad estructural con `SimulatedQrReceivedEmailPort` (US-068) pero dedicado al
// canal `[EMAIL] quoteReceived`. SEC-02 no-PII: sólo se emiten claves seguras
// (`userId, quoteId, quoteRequestId, eventId, vendorProfileId, correlationId,
// subject, body localizados`).
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export interface SimulatedQuoteReceivedEmailInput {
  toUserId: string;
  quoteId: string;
  quoteRequestId: string;
  eventId: string;
  vendorProfileId: string;
  language: SupportedLanguage;
  correlationId: string;
}

export interface SimulatedQuoteReceivedEmailPort {
  logEmail(input: SimulatedQuoteReceivedEmailInput): void;
}
