// Whitelist mapper — PublicVendorRepository → PublicVendorDto (US-046 / BE-003, §7, §12).
// Convierte la vista rica del repository en el DTO externo con **whitelist explícita**:
// sólo los campos declarados en D1 (decisión resuelta) llegan a la respuesta HTTP. La
// pseudonimización de `reviewerDisplayName` reduce la exposición de PII: se emite el primer
// nombre + inicial del apellido (`"Juan P."`); cuando `fullName` no está poblado se cae a
// `"Anónimo"` (sin filtrar por locale — la UI no debe mostrar strings vacíos).
//
// Portfolio: los attachments por vendor se agrupan por `work_label` y se emiten como
// grupos ordenados; cada grupo mantiene el orden natural (`created_at ASC`) definido por el
// repository.
import type {
  PublicVendorDto,
  PublicVendorPortfolioGroupDto,
} from '../interface/dto/public-vendor.response.js';
import type { PublicVendorRecord } from '../ports/public-vendor.repository.js';

const REVIEWER_FALLBACK = 'Anónimo';

function pseudonymizeReviewer(fullName: string): string {
  const trimmed = fullName.trim();
  if (trimmed.length === 0) return REVIEWER_FALLBACK;
  const parts = trimmed.split(/\s+/);
  const first = parts[0]!;
  if (parts.length === 1) return first;
  const initial = parts[1]!.charAt(0).toUpperCase();
  return initial.length > 0 ? `${first} ${initial}.` : first;
}

function resolveLocationDisplay(record: PublicVendorRecord['location']): string {
  if (record === null) return '';
  const bits = [record.city, record.region, record.country].filter(
    (b): b is string => typeof b === 'string' && b.trim().length > 0,
  );
  return bits.length === 0 ? '' : bits.join(', ');
}

function groupPortfolio(
  attachments: PublicVendorRecord['portfolio'],
): PublicVendorPortfolioGroupDto[] {
  const groups = new Map<string, string[]>();
  for (const a of attachments) {
    const list = groups.get(a.workLabel);
    if (list) list.push(a.url);
    else groups.set(a.workLabel, [a.url]);
  }
  return Array.from(groups.entries()).map(([workLabel, thumbnails]) => ({
    workLabel,
    thumbnails,
  }));
}

export function toPublicVendorDto(record: PublicVendorRecord): PublicVendorDto {
  return {
    slug: record.slug,
    businessName: record.businessName,
    bio: record.bio ?? '',
    location: {
      display: resolveLocationDisplay(record.location),
      code: record.location?.code ?? null,
    },
    categories: record.categories.map((c) => ({ code: c.code, name: c.label })),
    ratingAvg: record.ratingAvg,
    reviewsCount: record.reviewsCount,
    reviewsTotalPublished: record.reviewsTotalPublished,
    packages: record.packages.map((p) => ({
      packageName: p.packageName,
      basePrice: p.basePrice,
      currencyCode: p.currencyCode,
      description: p.description,
      serviceCategoryCode: p.serviceCategoryCode,
    })),
    portfolio: groupPortfolio(record.portfolio),
    reviews: record.reviews.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      reviewerDisplayName: pseudonymizeReviewer(r.reviewerDisplayName),
    })),
  };
}
