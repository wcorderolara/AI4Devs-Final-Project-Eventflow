// Use case — Buscar vendors aprobados (US-045 / BE-004, AC-01..04, EC-01..05).
// Orquesta: resolución de slugs → IDs, decode del cursor, invocación al repository con `limit+1`
// para detectar `hasNext`, y armado del cursor de la siguiente página. Vendor authenticated
// se excluye de sus propios resultados (SEC-03).
//
// Los slugs (`categoryCode`, `locationCode`) inexistentes o inactivos producen `INVALID_FILTERS`
// con un `details.invalid` que enumera *todos* los fallos a la vez (D3 strict).
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';
import { InvalidFiltersError, InvalidCursorError } from './vendor-search.errors.js';
import {
  decodeVendorSearchCursor,
  encodeVendorSearchCursor,
  type VendorSearchCursor,
} from './vendor-search-cursor.js';
import type {
  VendorSearchRepository,
  VendorSearchRow,
} from '../ports/vendor-search.repository.js';

export type SearchVendorsCurrentUser =
  | { id: string; role: 'organizer' | 'vendor' | 'admin' }
  | { id: string; role: string };

export interface SearchVendorsQuery {
  categoryCode?: string;
  locationCode?: string;
  priceMin?: string;
  priceMax?: string;
  currency?: SupportedCurrency;
  cursor?: string;
  limit: number;
}

export interface SearchVendorsResult {
  items: VendorSearchRow[];
  page: { cursor: string | null; limit: number; hasNext: boolean };
}

export interface ServiceCategorySlugResolver {
  findActiveIdByCode(code: string): Promise<string | null>;
}

export interface LocationSlugResolver {
  findIdByCode(code: string): Promise<string | null>;
}

export class SearchVendorsUseCase {
  constructor(
    private readonly repository: VendorSearchRepository,
    private readonly categoryResolver: ServiceCategorySlugResolver,
    private readonly locationResolver: LocationSlugResolver,
  ) {}

  async execute(args: {
    currentUser: SearchVendorsCurrentUser;
    query: SearchVendorsQuery;
  }): Promise<SearchVendorsResult> {
    const { currentUser, query } = args;

    const invalid: string[] = [];
    let categoryId: string | null = null;
    let locationId: string | null = null;

    if (query.categoryCode !== undefined) {
      categoryId = await this.categoryResolver.findActiveIdByCode(query.categoryCode);
      if (categoryId === null) invalid.push('categoryCode');
    }
    if (query.locationCode !== undefined) {
      locationId = await this.locationResolver.findIdByCode(query.locationCode);
      if (locationId === null) invalid.push('locationCode');
    }
    if (invalid.length > 0) {
      throw new InvalidFiltersError(invalid);
    }

    let cursor: VendorSearchCursor | null = null;
    if (query.cursor !== undefined) {
      cursor = decodeVendorSearchCursor(query.cursor);
      if (cursor === null) throw new InvalidCursorError();
    }

    const excludeUserId = currentUser.role === 'vendor' ? currentUser.id : null;

    const rows = await this.repository.searchApprovedVendors({
      filters: {
        categoryId,
        locationId,
        priceMin: query.priceMin ?? null,
        priceMax: query.priceMax ?? null,
        currency: query.currency ?? null,
      },
      cursor,
      limit: query.limit + 1,
      excludeUserId,
    });

    const hasNext = rows.length > query.limit;
    const items = hasNext ? rows.slice(0, query.limit) : rows;
    const nextCursor =
      hasNext && items.length > 0
        ? encodeVendorSearchCursor({
            ratingAvg: items[items.length - 1]!.ratingAvg,
            createdAt: items[items.length - 1]!.createdAt,
            id: items[items.length - 1]!.id,
          })
        : null;

    return {
      items,
      page: { cursor: nextCursor, limit: query.limit, hasNext },
    };
  }
}
