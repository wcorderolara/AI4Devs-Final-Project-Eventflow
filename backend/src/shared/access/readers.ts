// Puertos de lectura cross-cutting (US-096 / BE-003, SEC-001/002). Permiten a quote-flow y
// booking-intent resolver ownership de evento, VendorProfile del usuario y categoría activa SIN
// importar otros módulos (ADR-ARCH-001): los adapters (app-infra) consultan las tablas directamente.
import type { SupportedCurrency } from '../constants/currencies.js';
import type { SupportedLanguage } from '../constants/languages.js';

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

export interface ActiveVendorProfile {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  userId: string;
}

export interface VendorProfileReader {
  /** VendorProfile id del usuario (rol vendor), o null si no tiene perfil. */
  getVendorProfileIdForUser(userId: string): Promise<string | null>;
  /** ¿Existe un VendorProfile no soft-deleted con ese id? */
  existsActive(vendorProfileId: string): Promise<boolean>;
  /**
   * US-051 (BE-002): devuelve el VendorProfile visible del usuario. Filtra `deletedAt IS NULL`.
   * El UC decide qué estados aceptar (por ej. rechazar `hidden` para responder `404` uniforme).
   */
  findActiveByUserId(userId: string): Promise<ActiveVendorProfile | null>;
}

export interface ActiveServiceCategory {
  id: string;
  code: string;
  label: string;
}

export interface ServiceCategoryReader {
  existsActive(id: string): Promise<boolean>;
  // US-057 (PB-P1-035 / BE-004): lookup por slug (`code`) para el endpoint compare. Devuelve
  // sólo si `is_active=true` y `deleted_at IS NULL`; null en cualquier otro caso.
  findActiveByCode(code: string): Promise<ActiveServiceCategory | null>;
}

export interface QuoteRequestEventReader {
  /** eventId al que pertenece el QuoteRequest, o null si no existe. */
  getEventId(quoteRequestId: string): Promise<string | null>;
}

/**
 * US-082 (PB-P1-047 / D5, AC-05). Reader dedicado del `languageCode` de un evento. Los AI use
 * cases event-scoped y quote-request-scoped lo consultan para pasar `locale = event.languageCode`
 * al provider IA. Se define como puerto independiente para no romper implementaciones existentes
 * de `EventAccessReader` (varios fakes de tests).
 */
export interface EventLanguageReader {
  /** `event.languageCode` o null si el evento no existe. */
  getLanguage(eventId: string): Promise<SupportedLanguage | null>;
}
