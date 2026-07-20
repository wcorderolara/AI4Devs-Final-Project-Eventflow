// US-046 (PB-P1-029 / QA-001 + QA-005) — Unit tests.
// Cobertura:
//   - DTO `PublicVendorSlugParamSchema`: regex + longitud + rechazo defensivo.
//   - Whitelist mapper: no expone email/phone/IDs internos; agrupa portfolio por workLabel;
//     pseudonimiza reviewers; deriva location.display.
//   - `GetPublicVendorBySlugUseCase`: branches happy / not found / sin portfolio / sin reviews.
import { describe, expect, it, vi } from 'vitest';
import { PublicVendorSlugParamSchema } from '../../src/modules/vendor-management/interface/dto/public-vendor-slug.param.js';
import { toPublicVendorDto } from '../../src/modules/vendor-management/application/public-vendor.mapper.js';
import { GetPublicVendorBySlugUseCase } from '../../src/modules/vendor-management/application/get-public-vendor-by-slug.use-case.js';
import type {
  PublicVendorRecord,
  PublicVendorRepository,
} from '../../src/modules/vendor-management/ports/public-vendor.repository.js';

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────
describe('US-046 · PublicVendorSlugParamSchema', () => {
  it('acepta slugs válidos', () => {
    for (const slug of ['a', 'banquetes-el-quetzal', 'foto-estudio-aurora-42', 'x-1']) {
      const parsed = PublicVendorSlugParamSchema.safeParse({ slug });
      expect(parsed.success, `slug=${slug}`).toBe(true);
    }
  });

  it('rechaza mayúsculas, underscores, espacios y caracteres unicode', () => {
    for (const slug of ['Banquetes', 'foo_bar', 'foo bar', 'á-b', '../etc', 'foo?bar']) {
      const parsed = PublicVendorSlugParamSchema.safeParse({ slug });
      expect(parsed.success, `slug=${slug}`).toBe(false);
    }
  });

  it('rechaza longitud fuera de rango [1..200]', () => {
    expect(PublicVendorSlugParamSchema.safeParse({ slug: '' }).success).toBe(false);
    const long = 'a'.repeat(201);
    expect(PublicVendorSlugParamSchema.safeParse({ slug: long }).success).toBe(false);
    const ok = 'a'.repeat(200);
    expect(PublicVendorSlugParamSchema.safeParse({ slug: ok }).success).toBe(true);
  });

  it('rechaza payload con claves extra (`.strict()`)', () => {
    const parsed = PublicVendorSlugParamSchema.safeParse({ slug: 'ok', extra: 'x' });
    expect(parsed.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mapper
// ─────────────────────────────────────────────────────────────────────────────
function baseRecord(overrides: Partial<PublicVendorRecord> = {}): PublicVendorRecord {
  return {
    id: '00000000-0000-0000-0046-000000000001',
    slug: 'banquetes-el-quetzal',
    businessName: 'Banquetes El Quetzal',
    bio: 'Servicio de banquetes para bodas.',
    ratingAvg: 4.75,
    reviewsCount: 12,
    reviewsTotalPublished: 12,
    location: { code: 'GT-GUA', country: 'Guatemala', region: 'Guatemala', city: 'Ciudad de Guatemala' },
    categories: [{ code: 'catering', label: 'Catering' }],
    packages: [
      {
        packageName: 'Menú clásico',
        basePrice: '250.00',
        currencyCode: 'GTQ',
        description: 'Menú para 100 invitados.',
        serviceCategoryCode: 'catering',
      },
    ],
    portfolio: [
      { workLabel: 'boda-clasica', url: 'https://cdn/1.jpg' },
      { workLabel: 'boda-clasica', url: 'https://cdn/2.jpg' },
      { workLabel: 'quince-anos', url: 'https://cdn/3.jpg' },
    ],
    reviews: [
      {
        rating: 5,
        comment: '¡Excelente!',
        createdAt: new Date('2026-06-15T10:00:00Z'),
        reviewerDisplayName: 'Juan Pérez',
      },
      {
        rating: 4,
        comment: null,
        createdAt: new Date('2026-06-10T10:00:00Z'),
        reviewerDisplayName: '',
      },
    ],
    ...overrides,
  };
}

describe('US-046 · toPublicVendorDto (whitelist mapper)', () => {
  it('no expone email/teléfono/IDs internos ni `deletedAt`', () => {
    // US-066 (PB-P1-039): `id` del vendor SE expone en el DTO para habilitar el listado
    // paginado del cliente (`GET /vendors/:id/reviews`). Ya no forma parte del set prohibido.
    const dto = toPublicVendorDto(baseRecord());
    const forbidden = ['email', 'phone', 'password', 'userId', 'deletedAt', 'ownerId'];
    for (const key of forbidden) {
      expect(dto).not.toHaveProperty(key);
    }
    for (const p of dto.packages) {
      for (const key of forbidden) expect(p).not.toHaveProperty(key);
    }
    for (const r of dto.reviews) {
      for (const key of ['authorId', 'bookingIntentId', 'vendorProfileId', 'email']) {
        expect(r).not.toHaveProperty(key);
      }
    }
  });

  it('agrupa portfolio por workLabel preservando orden', () => {
    const dto = toPublicVendorDto(baseRecord());
    expect(dto.portfolio).toEqual([
      { workLabel: 'boda-clasica', thumbnails: ['https://cdn/1.jpg', 'https://cdn/2.jpg'] },
      { workLabel: 'quince-anos', thumbnails: ['https://cdn/3.jpg'] },
    ]);
  });

  it('pseudonimiza reviewers (`"Juan P."`) y usa fallback cuando falta el fullName', () => {
    const dto = toPublicVendorDto(baseRecord());
    expect(dto.reviews[0]?.reviewerDisplayName).toBe('Juan P.');
    expect(dto.reviews[1]?.reviewerDisplayName).toBe('Anónimo');
  });

  it('deriva location.display uniendo city, region, country', () => {
    const dto = toPublicVendorDto(baseRecord());
    expect(dto.location.display).toBe('Ciudad de Guatemala, Guatemala, Guatemala');
    expect(dto.location.code).toBe('GT-GUA');
  });

  it('emite location vacío cuando el vendor no tiene location', () => {
    const dto = toPublicVendorDto(baseRecord({ location: null }));
    expect(dto.location).toEqual({ display: '', code: null });
  });

  it('mantiene ratingAvg null cuando no hay reviews', () => {
    const dto = toPublicVendorDto(
      baseRecord({ ratingAvg: null, reviewsCount: 0, reviewsTotalPublished: 0, reviews: [] }),
    );
    expect(dto.ratingAvg).toBeNull();
    expect(dto.reviewsCount).toBe(0);
    expect(dto.reviewsTotalPublished).toBe(0);
    expect(dto.reviews).toEqual([]);
  });

  it('convierte bio null a string vacío (defensa para JSON-LD)', () => {
    const dto = toPublicVendorDto(baseRecord({ bio: null }));
    expect(dto.bio).toBe('');
  });

  it('emite createdAt de reviews como ISO 8601 string', () => {
    const dto = toPublicVendorDto(baseRecord());
    expect(dto.reviews[0]?.createdAt).toBe('2026-06-15T10:00:00.000Z');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Use case
// ─────────────────────────────────────────────────────────────────────────────
function repoWith(record: PublicVendorRecord | null): PublicVendorRepository {
  return {
    findPublicApprovedBySlug: vi.fn().mockResolvedValue(record),
  };
}

describe('US-046 · GetPublicVendorBySlugUseCase', () => {
  it('retorna null cuando el repository no encuentra un vendor approved (D6)', async () => {
    const useCase = new GetPublicVendorBySlugUseCase(repoWith(null));
    const dto = await useCase.execute({ slug: 'missing' });
    expect(dto).toBeNull();
  });

  it('mapea el record al DTO cuando el vendor existe y está approved', async () => {
    const useCase = new GetPublicVendorBySlugUseCase(repoWith(baseRecord()));
    const dto = await useCase.execute({ slug: 'banquetes-el-quetzal' });
    expect(dto).not.toBeNull();
    expect(dto!.slug).toBe('banquetes-el-quetzal');
    expect(dto!.categories).toEqual([{ code: 'catering', name: 'Catering' }]);
  });

  it('mapea vendor sin portfolio ni reviews sin explotar', async () => {
    const useCase = new GetPublicVendorBySlugUseCase(
      repoWith(
        baseRecord({
          portfolio: [],
          reviews: [],
          reviewsCount: 0,
          reviewsTotalPublished: 0,
          ratingAvg: null,
        }),
      ),
    );
    const dto = await useCase.execute({ slug: 'x' });
    expect(dto).not.toBeNull();
    expect(dto!.portfolio).toEqual([]);
    expect(dto!.reviews).toEqual([]);
  });
});
