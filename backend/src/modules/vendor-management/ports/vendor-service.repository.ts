// Port — `VendorServiceRepository` (US-044 / PB-P1-027 BE-003).
// Aísla los use cases del cliente Prisma. Todas las escrituras son single-row (no requieren
// transacción explícita — la política de status del perfil se resuelve en el use case).
import type {
  VendorServiceCurrencyCode,
  VendorServiceView,
} from '../domain/vendor-service.js';

export interface CreateVendorServiceInput {
  vendorProfileId: string;
  serviceCategoryId: string;
  packageName: string;
  description: string;
  basePrice: string;
  currencyCode: VendorServiceCurrencyCode;
}

export interface UpdateVendorServiceInput {
  packageName?: string;
  description?: string;
  basePrice?: string;
  currencyCode?: VendorServiceCurrencyCode;
  serviceCategoryId?: string;
  isActive?: boolean;
}

/** Snapshot mínimo para decisiones de reactivación (BE-005). */
export interface VendorServiceOwnedSnapshot {
  id: string;
  vendorProfileId: string;
  isActive: boolean;
}

export interface VendorServiceRepository {
  /** VR-05: cardinalidad de servicios activos del vendor. */
  countActiveByVendorProfileId(vendorProfileId: string): Promise<number>;

  /** AC-01d: lista completa del vendor (activos + inactivos) ordenada por createdAt desc. */
  findAllByVendorProfileId(vendorProfileId: string): Promise<VendorServiceView[]>;

  /** AC-01b: snapshot para PATCH (cualquier estado, propio). */
  findOwnedById(id: string, vendorProfileId: string): Promise<VendorServiceOwnedSnapshot | null>;

  /** Idempotencia AC-01c: verifica que el servicio pertenece al vendor (activo o no). */
  existsOwnedById(id: string, vendorProfileId: string): Promise<boolean>;

  /** AC-01a: inserción del servicio con `isActive=true`. */
  create(input: CreateVendorServiceInput): Promise<VendorServiceView>;

  /** AC-01b: patch parcial. */
  update(
    id: string,
    vendorProfileId: string,
    patch: UpdateVendorServiceInput,
  ): Promise<VendorServiceView>;

  /**
   * AC-01c / EC-09: setea `isActive=false`. Retorna `{ transitioned }` — `true` si la fila
   * estaba activa (transición real), `false` si ya estaba inactiva (idempotente, sin log de
   * desactivación pero response 204).
   */
  softDeactivate(
    id: string,
    vendorProfileId: string,
  ): Promise<{ transitioned: boolean } | null>;
}
