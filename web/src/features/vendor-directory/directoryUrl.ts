// Query string de los directorios de proveedores (`/vendors` y `/organizer/vendors`).
//
// Nombres públicos, cortos y estables en la URL (`category`, `city`, `minPrice`, `maxPrice`,
// `currency`, `cursor`), independientes del modelo interno del formulario y del contrato de la
// API (`categoryCode`, `locationCode`, `priceMin`, `priceMax`). Este módulo es el único sitio
// que traduce entre ambos: cambiar la API no cambia los enlaces compartidos, y viceversa.
// Sin `'use client'`: lo usan Server Components (directorio público) y el cliente por igual.
import type { VendorFiltersValue } from './components/VendorFilters';

/** Campo del formulario → nombre del query param en la URL. */
export const DIRECTORY_URL_PARAMS = {
  categoryCode: 'category',
  locationCode: 'city',
  priceMin: 'minPrice',
  priceMax: 'maxPrice',
  currency: 'currency',
} as const satisfies Record<keyof VendorFiltersValue, string>;

/** Query param de paginación (cursor opaco del backend). */
export const DIRECTORY_CURSOR_PARAM = 'cursor';

type ParamReader = (name: string) => string | null | undefined;

/** Lee los filtros de una URL (`URLSearchParams#get` o el `searchParams` de una página). */
export function readDirectoryFilters(get: ParamReader): VendorFiltersValue {
  const read = (field: keyof VendorFiltersValue): string => get(DIRECTORY_URL_PARAMS[field])?.trim() ?? '';
  return {
    categoryCode: read('categoryCode'),
    locationCode: read('locationCode'),
    priceMin: read('priceMin'),
    priceMax: read('priceMax'),
    currency: read('currency') as VendorFiltersValue['currency'],
  };
}

/** Serializa los filtros (y, si hay, el cursor) a la query string de la URL. Omite los vacíos. */
export function directoryFiltersToSearchParams(
  value: VendorFiltersValue,
  cursor?: string | null,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const field of Object.keys(DIRECTORY_URL_PARAMS) as Array<keyof VendorFiltersValue>) {
    const raw = value[field].trim();
    if (raw) params.set(DIRECTORY_URL_PARAMS[field], raw);
  }
  if (cursor) params.set(DIRECTORY_CURSOR_PARAM, cursor);
  return params;
}
