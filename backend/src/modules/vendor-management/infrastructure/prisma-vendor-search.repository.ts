// Adapter Prisma — VendorSearchRepository (US-045 / BE-003).
// Ejecuta la consulta principal del directorio con `$queryRawUnsafe` para poder aplicar
// el keyset predicate `(rating_avg, created_at, id) < (?, ?, ?)` con `NULLS LAST` correcto
// (Prisma builder no expresa la tupla completa con nulos). Toda entrada dinámica se
// parametriza — nunca concatenada — y las categorías/códigos de cada vendor se resuelven
// con dos SELECT auxiliares en batch para evitar N+1.
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type {
  VendorSearchQueryInput,
  VendorSearchRepository,
  VendorSearchRow,
} from '../ports/vendor-search.repository.js';

interface RawVendorRow {
  id: string;
  slug: string | null;
  business_name: string;
  location_id: string | null;
  rating_avg: string | null;
  reviews_count: number;
  created_at: Date;
}

interface RawLocationRow {
  id: string;
  code: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
}

/** "Ciudad, Región, País" con las partes presentes, igual que el perfil público (US-046). */
function locationDisplay(loc: RawLocationRow): string | null {
  const bits = [loc.city, loc.region, loc.country].filter(
    (b): b is string => typeof b === 'string' && b.trim().length > 0,
  );
  return bits.length === 0 ? null : bits.join(', ');
}

interface RawCategoryRow {
  vendor_profile_id: string;
  code: string;
  label: string;
}

interface RawPriceAggRow {
  vendor_profile_id: string;
  price_min: string | null;
  price_max: string | null;
}

export class PrismaVendorSearchRepository implements VendorSearchRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async searchApprovedVendors(input: VendorSearchQueryInput): Promise<VendorSearchRow[]> {
    const params: unknown[] = [];
    // US-047 (PB-P1-041 / AC-04): filtro `is_hidden = false` — un vendor `approved+hidden`
    // desaparece del directorio público sin cambiar de status (Decisión PO D2, flag ortogonal).
    const where: string[] = [
      `vp.status = 'approved'`,
      `vp.is_hidden = false`,
      `vp.deleted_at IS NULL`,
    ];

    if (input.filters.locationId !== null) {
      params.push(input.filters.locationId);
      where.push(`vp.location_id = $${params.length}::uuid`);
    }

    if (input.filters.categoryId !== null) {
      params.push(input.filters.categoryId);
      // Una categoría padre incluye a sus subcategorías: filtrar por "Música" también encuentra
      // a los proveedores de Marimba o Mariachi (el filtro de la UI agrupa hijas bajo su padre).
      where.push(
        `EXISTS (SELECT 1 FROM "vendor_profile_categories" vpc WHERE vpc."vendor_profile_id" = vp."id" AND vpc."service_category_id" IN (SELECT sc."id" FROM "service_categories" sc WHERE sc."id" = $${params.length}::uuid OR sc."parent_id" = $${params.length}::uuid))`,
      );
    }

    if (
      input.filters.currency !== null &&
      (input.filters.priceMin !== null || input.filters.priceMax !== null)
    ) {
      const priceMin = input.filters.priceMin ?? '0';
      const priceMax = input.filters.priceMax ?? '999999999999.99';
      params.push(input.filters.currency);
      const currencyIdx = params.length;
      params.push(priceMin);
      const priceMinIdx = params.length;
      params.push(priceMax);
      const priceMaxIdx = params.length;
      where.push(
        `EXISTS (
          SELECT 1 FROM "vendor_services" vs
          WHERE vs."vendor_profile_id" = vp."id"
            AND vs."is_active" = true
            AND vs."deleted_at" IS NULL
            AND vs."currency_code"::text = $${currencyIdx}
            AND vs."base_price" BETWEEN $${priceMinIdx}::numeric AND $${priceMaxIdx}::numeric
        )`,
      );
    }

    if (input.excludeUserId !== null) {
      params.push(input.excludeUserId);
      where.push(`vp."user_id" <> $${params.length}::uuid`);
    }

    if (input.cursor !== null) {
      // Keyset con `NULLS LAST` sobre `rating_avg`. La comparación se expresa por casos para
      // preservar el orden correcto ante `NULL`s (una tupla `<` estándar los antepone).
      params.push(input.cursor.createdAt);
      const cAtIdx = params.length;
      params.push(input.cursor.id);
      const cIdIdx = params.length;
      if (input.cursor.ratingAvg === null) {
        // El cursor apunta a un vendor sin rating: sólo faltan por paginar los que también
        // están sin rating y son "menores" por (created_at DESC, id DESC).
        where.push(
          `vp."rating_avg" IS NULL AND (vp."created_at", vp."id") < ($${cAtIdx}::timestamptz, $${cIdIdx}::uuid)`,
        );
      } else {
        params.push(input.cursor.ratingAvg);
        const cRatingIdx = params.length;
        where.push(
          `(
            vp."rating_avg" < $${cRatingIdx}::numeric
            OR (vp."rating_avg" = $${cRatingIdx}::numeric AND (vp."created_at", vp."id") < ($${cAtIdx}::timestamptz, $${cIdIdx}::uuid))
            OR vp."rating_avg" IS NULL
          )`,
        );
      }
    }

    params.push(input.limit);
    const limitIdx = params.length;

    const sql = `
      SELECT
        vp."id"            AS id,
        vp."slug"          AS slug,
        vp."business_name" AS business_name,
        vp."location_id"   AS location_id,
        vp."rating_avg"    AS rating_avg,
        vp."reviews_count" AS reviews_count,
        vp."created_at"    AS created_at
      FROM "vendor_profiles" vp
      WHERE ${where.join(' AND ')}
      ORDER BY vp."rating_avg" DESC NULLS LAST, vp."created_at" DESC, vp."id" DESC
      LIMIT $${limitIdx}::int
    `;

    const rows = await this.prisma.$queryRawUnsafe<RawVendorRow[]>(sql, ...params);
    if (rows.length === 0) return [];

    const vendorIds = rows.map((r) => r.id);
    const locationIds = uniqueDefined(rows.map((r) => r.location_id));

    const [locations, categories, priceAggs] = await Promise.all([
      locationIds.length === 0
        ? Promise.resolve([] as RawLocationRow[])
        : this.prisma.$queryRawUnsafe<RawLocationRow[]>(
            `SELECT "id", "code", "city", "region", "country" FROM "locations" WHERE "id" = ANY($1::uuid[])`,
            locationIds,
          ),
      this.prisma.$queryRawUnsafe<RawCategoryRow[]>(
        `SELECT vpc."vendor_profile_id" AS vendor_profile_id, sc."code" AS code, sc."label" AS label
         FROM "vendor_profile_categories" vpc
         JOIN "service_categories" sc ON sc."id" = vpc."service_category_id"
         WHERE vpc."vendor_profile_id" = ANY($1::uuid[])
         ORDER BY sc."code" ASC`,
        vendorIds,
      ),
      input.filters.currency === null
        ? Promise.resolve([] as RawPriceAggRow[])
        : this.prisma.$queryRawUnsafe<RawPriceAggRow[]>(
            `SELECT vs."vendor_profile_id" AS vendor_profile_id,
                    MIN(vs."base_price")::text AS price_min,
                    MAX(vs."base_price")::text AS price_max
             FROM "vendor_services" vs
             WHERE vs."vendor_profile_id" = ANY($1::uuid[])
               AND vs."is_active" = true
               AND vs."deleted_at" IS NULL
               AND vs."currency_code"::text = $2
             GROUP BY vs."vendor_profile_id"`,
            vendorIds,
            input.filters.currency,
          ),
    ]);

    const locationById = new Map(locations.map((l) => [l.id, l] as const));
    const categoriesById = groupBy(categories, (r) => r.vendor_profile_id, (r) => r.code);
    const categoryLabelsById = groupBy(
      categories,
      (r) => r.vendor_profile_id,
      (r) => ({ code: r.code, label: r.label }),
    );
    const priceById = new Map(priceAggs.map((p) => [p.vendor_profile_id, p] as const));

    return rows.map((row) => {
      const priceRow = priceById.get(row.id);
      const location = row.location_id ? locationById.get(row.location_id) : undefined;
      return {
        id: row.id,
        slug: row.slug,
        businessName: row.business_name,
        locationCode: location?.code ?? null,
        locationDisplay: location ? locationDisplay(location) : null,
        categoryCodes: categoriesById.get(row.id) ?? [],
        categoryLabels: categoryLabelsById.get(row.id) ?? [],
        ratingAvg: row.rating_avg === null ? null : Number(row.rating_avg),
        reviewsCount: Number(row.reviews_count),
        priceMin: priceRow?.price_min ?? null,
        priceMax: priceRow?.price_max ?? null,
        priceCurrency: input.filters.currency !== null && priceRow ? input.filters.currency : null,
        createdAt: row.created_at,
      } satisfies VendorSearchRow;
    });
  }
}

function uniqueDefined<T>(values: Array<T | null>): T[] {
  const set = new Set<T>();
  for (const v of values) {
    if (v !== null) set.add(v);
  }
  return [...set];
}

function groupBy<T, K, V>(items: T[], keyOf: (t: T) => K, valueOf: (t: T) => V): Map<K, V[]> {
  const map = new Map<K, V[]>();
  for (const item of items) {
    const key = keyOf(item);
    const existing = map.get(key);
    if (existing) existing.push(valueOf(item));
    else map.set(key, [valueOf(item)]);
  }
  return map;
}
