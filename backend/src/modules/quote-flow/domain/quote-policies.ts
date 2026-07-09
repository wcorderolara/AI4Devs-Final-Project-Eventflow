// Policies de dominio Quote/QuoteRequest (US-096 / BE-002). Capa pura (sin infra).
// Cubre: edición draft-only, transiciones de decisión, expiración y validez por defecto.
import type { QuoteStatusValue } from './quote.js';
import type { QuoteRequestStatusValue } from './quote-request.js';

export const QUOTE_VALIDITY_DAYS = 15;

/** Un Quote solo se edita en `draft` (AC-08, VR-08, EC-06). */
export function canEditQuote(status: QuoteStatusValue): boolean {
  return status === 'draft';
}

/** Solo un `draft` se puede enviar (AC-08). */
export function canSendQuote(status: QuoteStatusValue): boolean {
  return status === 'draft';
}

/** Solo un `sent` se puede aceptar/rechazar/preferir (AC-09). */
export function canDecideQuote(status: QuoteStatusValue): boolean {
  return status === 'sent';
}

/** ¿El Quote está expirado por estado o por ventana de validez vencida? (EC-07). */
export function isQuoteExpired(status: QuoteStatusValue, validUntil: Date | null, now: Date): boolean {
  if (status === 'expired') return true;
  if (validUntil && validUntil.getTime() < now.getTime()) return true;
  return false;
}

/** `validUntil` por defecto = createdAt + 15 días calendario cuando se omite al enviar (VR-07). */
export function defaultValidUntil(createdAt: Date): Date {
  return new Date(createdAt.getTime() + QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

/** Un QuoteRequest `sent` puede marcarse `viewed` (AC-06). */
export function canMarkViewed(status: QuoteRequestStatusValue): boolean {
  return status === 'sent';
}

/** Un QuoteRequest activo (no terminal) puede cancelarse (AC-05). */
export function canCancelQuoteRequest(status: QuoteRequestStatusValue): boolean {
  return status === 'sent' || status === 'viewed' || status === 'responded';
}
