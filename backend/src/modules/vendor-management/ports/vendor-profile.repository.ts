// Port — VendorProfileRepository (US-040 / BE-003). Aísla al use case de Prisma.
// La escritura ocurre dentro de una `prisma.$transaction` para atomicidad (AC-01).
import type { VendorProfileView } from '../domain/vendor-profile.js';
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

export interface VendorProfileRepository {
  /** ¿El usuario ya tiene VendorProfile (soft-deleted no cuenta)? */
  existsForUser(userId: string): Promise<boolean>;

  /** Retorna los slugs existentes que coinciden con `base` o `base-N`. */
  findSlugsStartingWith(base: string): Promise<string[]>;

  /** Crea el perfil y las relaciones M:N atómicamente. Lanza `SlugConflictError` si UNIQUE choca. */
  create(input: CreateVendorProfileInput): Promise<VendorProfileView>;
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
