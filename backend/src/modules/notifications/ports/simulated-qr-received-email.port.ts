// US-068 (PB-P2-005 / BE-004). Puerto `SimulatedQrReceivedEmailPort`.
// Paridad estructural con `SimulatedT7EmailPort` (US-034) pero dedicado al canal
// `[EMAIL] qrReceived`. SEC-02 no-PII: sólo se emiten claves seguras (userId,
// quoteRequestId, eventId, categoryCode, correlationId, subject, body localizados).
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export interface SimulatedQrReceivedEmailInput {
  toUserId: string;
  quoteRequestId: string;
  eventId: string;
  organizerId: string;
  categoryCode: string;
  language: SupportedLanguage;
  correlationId: string;
}

export interface SimulatedQrReceivedEmailPort {
  logEmail(input: SimulatedQrReceivedEmailInput): void;
}
