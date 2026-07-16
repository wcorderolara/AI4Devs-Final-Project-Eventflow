// Tipos de dominio de Quote (US-096 / BE-002). Vista pública en shape del contrato API.
// `totalPrice` mapea a `amount`; `currencyCode` a `currency` en persistencia.
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;
export type QuoteStatusValue = (typeof QUOTE_STATUSES)[number];

export interface QuoteBreakdownItem {
  label: string;
  amount: string;
}

export interface QuoteView {
  id: string;
  quoteRequestId: string;
  vendorProfileId: string;
  totalPrice: string;
  currencyCode: SupportedCurrency;
  breakdown: QuoteBreakdownItem[] | null;
  conditions: string | null;
  validUntil: string | null;
  status: QuoteStatusValue;
  isPreferred: boolean;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteData {
  quoteRequestId: string;
  vendorProfileId: string;
  totalPrice: string;
  currencyCode: SupportedCurrency;
  breakdown: QuoteBreakdownItem[];
  conditions: string;
  validUntil: string | null; // YYYY-MM-DD o ISO opcional en create
}

export interface UpdateQuoteData {
  totalPrice?: string;
  currencyCode?: SupportedCurrency;
  breakdown?: QuoteBreakdownItem[];
  conditions?: string;
  validUntil?: string | null;
}
