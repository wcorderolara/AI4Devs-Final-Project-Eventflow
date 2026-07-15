// Port — VendorProfileRepository (US-040 / BE-003, extendido en US-041 / BE-003).
// Aísla al use case de Prisma. Las escrituras que requieran atomicidad viven en
// `prisma.$transaction` (creación US-040; update+admin_action US-041).
import type { Prisma } from '@prisma/client';
import type { VendorProfileView, VendorProfileStatus } from '../domain/vendor-profile.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export interface CreateVendorProfileInput {
  vendorUserId: string;
  businessName: string;
  bio: string;
  locationId: string;
  languagesSupported: SupportedLanguage[];
  categoryIds: string[];
  slug: string;
}

export interface LocationReader {
  /** ¿La location existe y está activa? */
  existsActive(id: string): Promise<boolean>;
}

export interface ServiceCategoryLookup {
  /** Retorna los IDs de las categorías que existen y están activas dentro del subconjunto. */
  findActiveIds(ids: readonly string[]): Promise<{ id: string; name: string }[]>;
}

/** US-041 — snapshot minimalista del perfil para decisiones del use case (status/deletedAt). */
export interface VendorProfileEditableSnapshot {
  id: string;
  vendorUserId: string;
  status: VendorProfileStatus;
  deletedAt: Date | null;
}

/** US-041 — patch parcial sobre `vendor_profiles` (solo campos permitidos por Zod). */
export interface UpdateVendorProfileFields {
  businessName?: string;
  bio?: string;
  locationId?: string;
  languagesSupported?: SupportedLanguage[];
}

export interface VendorProfileRepository {
  /** ¿El usuario ya tiene VendorProfile (soft-deleted no cuenta)? */
  existsForUser(userId: string): Promise<boolean>;

  /** Retorna los slugs existentes que coinciden con `base` o `base-N`. */
  findSlugsStartingWith(base: string): Promise<string[]>;

  /** Crea el perfil y las relaciones M:N atómicamente. Lanza `SlugConflictError` si UNIQUE choca. */
  create(input: CreateVendorProfileInput): Promise<VendorProfileView>;

  /** US-041: perfil activo del vendor (deletedAt IS NULL). Devuelve snapshot para tomar decisiones. */
  findEditableByVendorUserId(
    vendorUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VendorProfileEditableSnapshot | null>;

  /**
   * US-041 EC-05: para diferenciar `PROFILE_NOT_FOUND` (404) de `PROFILE_DELETED` (409) en el
   * DELETE, expone el snapshot incluso si `deletedAt IS NOT NULL`.
   */
  findAnyByVendorUserId(vendorUserId: string): Promise<VendorProfileEditableSnapshot | null>;

  /** US-041: aplica el patch parcial. `tx` es obligatorio para participar en la transacción atómica. */
  update(
    id: string,
    patch: UpdateVendorProfileFields,
    tx: Prisma.TransactionClient,
  ): Promise<void>;

  /** US-041: transiciona status. `tx` obligatorio (parte de la transacción de re-pending). */
  updateStatus(
    id: string,
    status: VendorProfileStatus,
    tx: Prisma.TransactionClient,
  ): Promise<void>;

  /** US-041: soft delete. Setea `deletedAt=NOW()` y `deletedBy=vendorUserId`. */
  softDelete(id: string, deletedBy: string): Promise<void>;

  /** US-041: hidrata la vista completa (con categorías) para serializar el response del PATCH. */
  findByIdWithCategories(id: string): Promise<VendorProfileView | null>;
}

export class SlugConflictError extends Error {
  constructor(slug: string) {
    super(`Slug '${slug}' already in use`);
    this.name = 'SlugConflictError';
  }
}

export class ProfileAlreadyExistsError extends Error {
  constructor() {
    super('Vendor profile already exists for this user');
    this.name = 'ProfileAlreadyExistsError';
  }
}
