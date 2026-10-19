// Conversor de la query string de los directorios: nombres públicos en la URL, modelo interno
// (`categoryCode`, `locationCode`, `priceMin`, `priceMax`) en el formulario y la API.
import { describe, expect, it } from 'vitest';
import {
  directoryFiltersToSearchParams,
  readDirectoryFilters,
  type VendorFiltersValue,
} from '@/features/vendor-directory';

const FULL: VendorFiltersValue = {
  categoryCode: 'hora_loca',
  locationCode: 'GT-GUA',
  priceMin: '100',
  priceMax: '900',
  currency: 'GTQ',
};

describe('directoryUrl', () => {
  it('serializa con los nombres públicos y el cursor', () => {
    expect(directoryFiltersToSearchParams(FULL, 'abc').toString()).toBe(
      'category=hora_loca&city=GT-GUA&minPrice=100&maxPrice=900&currency=GTQ&cursor=abc',
    );
  });

  it('omite filtros vacíos', () => {
    const empty: VendorFiltersValue = { categoryCode: '', locationCode: ' ', priceMin: '', priceMax: '', currency: '' };
    expect(directoryFiltersToSearchParams({ ...empty, categoryCode: 'venue' }).toString()).toBe('category=venue');
  });

  it('lee la URL de vuelta al modelo del formulario (ida y vuelta)', () => {
    const params = directoryFiltersToSearchParams(FULL);
    expect(readDirectoryFilters((name) => params.get(name))).toEqual(FULL);
  });

  it('ignora los nombres internos en la URL', () => {
    const params = new URLSearchParams('categoryCode=venue&locationCode=GT-GUA');
    expect(readDirectoryFilters((name) => params.get(name)).categoryCode).toBe('');
  });
});
