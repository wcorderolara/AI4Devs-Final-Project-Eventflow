// Puertos de lectura cross-cutting (US-096 / BE-003, SEC-001/002). Permiten a quote-flow y
// booking-intent resolver ownership de evento, VendorProfile del usuario y categoría activa SIN
// importar otros módulos (ADR-ARCH-001): los adapters (app-infra) consultan las tablas directamente.
import type { SupportedCurrency } from '../constants/currencies.js';

export interface OwnedEvent {
  id: string;
  currency: SupportedCurrency;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
}

export interface EventAccessReader {
  /** ownerId (userId) del evento, o null si no existe. */
  getOwnerId(eventId: string): Promise<string | null>;
  /** Moneda del evento (para validar que el Quote use la misma moneda), o null si no existe. */
  getCurrency(eventId: string): Promise<SupportedCurrency | null>;
  /** Evento si pertenece al owner (sin importar estado); null si no existe o es de otro. */
  findOwnedEvent(eventId: string, ownerId: string): Promise<OwnedEvent | null>;
}

export interface VendorProfileReader {
  /** VendorProfile id del usuario (rol vendor), o null si no tiene perfil. */
  getVendorProfileIdForUser(userId: string): Promise<string | null>;
  /** ¿Existe un VendorProfile no soft-deleted con ese id? */
  existsActive(vendorProfileId: string): Promise<boolean>;
}

export interface ServiceCategoryReader {
  existsActive(id: string): Promise<boolean>;
}

export interface QuoteRequestEventReader {
  /** eventId al que pertenece el QuoteRequest, o null si no existe. */
  getEventId(quoteRequestId: string): Promise<string | null>;
}
