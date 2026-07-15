// Use case — CreateVendorProfile (US-040 / BE-004).
// Flujo (Tech Spec §7):
//  1. Verifica que el vendor no tenga perfil (EC-01 → 409 PROFILE_EXISTS).
//  2. Verifica location activa (EC-03 → 400 INVALID_VALUE).
//  3. Verifica cada categoría activa (EC-02 → 400 INVALID_VALUE con `invalid_categories`).
//  4. Genera slug base + candidato libre (D5, AC-03).
//  5. Persiste vía repository dentro de `prisma.$transaction`.
//     - Si UNIQUE(slug) explota por colisión concurrente, reintenta con el siguiente candidato.
//     - Si UNIQUE(user_id) explota → EC-01 (409).
//  6. Emite log `vendor.profile.created` (SEC-04, D3).
//
// La validación de forma (business_name, bio, categories.length, etc.) queda cubierta por Zod
// aguas arriba (`validateRequestMiddleware` + `.strict()`), por lo que el use case asume shape
// válido y se concentra en las reglas de negocio.
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';
import { ValidationError } from '../../../shared/domain/errors/validation.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';
import {
  ProfileAlreadyExistsError,
  SlugConflictError,
  type LocationReader,
  type ServiceCategoryLookup,
  type VendorProfileRepository,
} from '../ports/vendor-profile.repository.js';
import { VendorProfileAlreadyExistsError } from '../domain/vendor-profile.errors.js';
import type { VendorProfileView } from '../domain/vendor-profile.js';
import { pickNextSlug, slugify } from './slugify.js';
import type { VendorProfileEventLogger } from './vendor-profile-event-logger.js';

export interface CreateVendorProfileCommand {
  vendorUserId: string;
  businessName: string;
  bio: string;
  locationId: string;
  languagesSupported: SupportedLanguage[];
  categoryIds: string[];
}

export interface CreateVendorProfileContext {
  correlationId?: string;
}

/** Cap defensivo para el loop de retry por colisión de slug concurrente. */
const MAX_SLUG_RETRIES = 8;

export class CreateVendorProfileUseCase {
  constructor(
    private readonly repo: VendorProfileRepository,
    private readonly locations: LocationReader,
    private readonly categories: ServiceCategoryLookup,
    private readonly clock: ClockPort,
    private readonly events: VendorProfileEventLogger,
  ) {}

  async execute(
    cmd: CreateVendorProfileCommand,
    ctx: CreateVendorProfileContext = {},
  ): Promise<VendorProfileView> {
    const started = this.clock.now().getTime();

    if (await this.repo.existsForUser(cmd.vendorUserId)) {
      throw new VendorProfileAlreadyExistsError();
    }

    if (!(await this.locations.existsActive(cmd.locationId))) {
      throw new ValidationError('Location is not available', [
        { field: 'location_id', message: ErrorCodes.INVALID_VALUE },
      ]);
    }

    // De-dup preservando orden (el usuario podría enviar duplicados; los tratamos como una sola
    // categoría). El cap 1-3 ya fue validado por Zod sobre el array original.
    const uniqueCategoryIds = Array.from(new Set(cmd.categoryIds));
    const activeCategories = await this.categories.findActiveIds(uniqueCategoryIds);
    const activeById = new Map(activeCategories.map((c) => [c.id, c] as const));
    const invalidCategories = uniqueCategoryIds.filter((id) => !activeById.has(id));
    if (invalidCategories.length > 0) {
      throw new ValidationError('One or more categories are invalid or inactive', [
        { field: 'categories', message: ErrorCodes.INVALID_VALUE },
        { field: 'invalid_categories', message: invalidCategories.join(',') },
      ]);
    }

    const base = slugify(cmd.businessName);
    const existingSlugs = await this.repo.findSlugsStartingWith(base);
    let candidate = pickNextSlug(base, existingSlugs);
    const attempted = new Set<string>([candidate]);

    let created: VendorProfileView | null = null;
    for (let attempt = 0; attempt < MAX_SLUG_RETRIES && created === null; attempt++) {
      try {
        created = await this.repo.create({
          vendorUserId: cmd.vendorUserId,
          businessName: cmd.businessName,
          bio: cmd.bio,
          locationId: cmd.locationId,
          languagesSupported: cmd.languagesSupported,
          categoryIds: uniqueCategoryIds,
          slug: candidate,
        });
      } catch (err) {
        if (err instanceof ProfileAlreadyExistsError) {
          throw new VendorProfileAlreadyExistsError();
        }
        if (err instanceof SlugConflictError) {
          const refreshed = await this.repo.findSlugsStartingWith(base);
          const seen = new Set<string>([...refreshed, ...attempted]);
          candidate = pickNextSlug(base, [...seen]);
          attempted.add(candidate);
          continue;
        }
        throw err;
      }
    }

    if (created === null) {
      // Extremadamente improbable: >MAX_SLUG_RETRIES colisiones concurrentes. Se propaga como
      // 500 sin filtrar contenido interno.
      throw new Error('Unable to allocate a unique slug for the vendor profile');
    }

    this.events.emitProfileCreated(created, {
      correlationId: ctx.correlationId,
      durationMs: this.clock.now().getTime() - started,
    });

    return created;
  }
}
