// Auditoría axe-core del directorio público (`/vendors`), en los cuatro locales del MVP.
//
// Umbral del gate (US-131 / OPS-001): 0 violaciones `critical`. Aquí se endurece a **0
// violaciones de cualquier severidad**, igual que el resto de suites públicas.
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { AbstractIntlMessages } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { PublicVendorDirectory } from '@/features/vendor-public';
import enVendor from '@/messages/en/vendor.json';
import esEsVendor from '@/messages/es-ES/vendor.json';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';
import ptVendor from '@/messages/pt/vendor.json';
import { server } from '@/tests/msw/server';
import { auditA11y, formatViolations } from './helpers/axe';
import { renderWithProviders, type Locale } from './helpers/render-with-intl';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Los catálogos por locale son parciales a propósito: en producción `loadMessages` los mergea
// sobre `es-LATAM`, así que una clave ausente cae a la traducción base. El test reproduce ese
// merge en lugar de asumir catálogos completos — de lo contrario probaría algo que no ocurre.
type VendorCatalog = Record<string, unknown>;

function mergeOverBase(override: VendorCatalog): VendorCatalog {
  const isObject = (v: unknown): v is VendorCatalog =>
    typeof v === 'object' && v !== null && !Array.isArray(v);
  const merge = (base: VendorCatalog, patch: VendorCatalog): VendorCatalog => {
    const out: VendorCatalog = { ...base };
    for (const [key, value] of Object.entries(patch)) {
      const current = out[key];
      out[key] = isObject(current) && isObject(value) ? merge(current, value) : value;
    }
    return out;
  };
  return merge(esLatamVendor as unknown as VendorCatalog, override);
}

const CATALOG: Record<Locale, VendorCatalog> = {
  'es-LATAM': esLatamVendor as unknown as VendorCatalog,
  'es-ES': mergeOverBase(esEsVendor as unknown as VendorCatalog),
  pt: mergeOverBase(ptVendor as unknown as VendorCatalog),
  en: mergeOverBase(enVendor as unknown as VendorCatalog),
};

let activeLocale: Locale = 'es-LATAM';

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => {
    const path = namespace.split('.');
    let node: unknown = { vendor: CATALOG[activeLocale] };
    for (const key of path) node = (node as Record<string, unknown>)[key];
    return (key: string) => {
      let value: unknown = node;
      for (const part of key.split('.')) value = (value as Record<string, unknown>)[part];
      return value as string;
    };
  },
}));

const ENDPOINT = '*/api/v1/public/vendors';

const ITEMS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'catering-la-ceiba',
    businessName: 'Catering La Ceiba',
    locationCode: 'GT-GUA',
    categories: ['catering'],
    ratingAvg: 4.7,
    reviewsCount: 12,
    priceRange: { min: '200.00', max: '800.00', currency: 'GTQ' },
    thumbnailUrl: null,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    slug: 'dj-luna',
    businessName: 'DJ Luna',
    locationCode: null,
    categories: [],
    // Sin valoración: la card debe seguir siendo legible sin depender del número.
    ratingAvg: null,
    reviewsCount: 0,
    priceRange: null,
    thumbnailUrl: null,
  },
];

async function renderDirectory(locale: Locale, page: Record<string, unknown> = {}) {
  activeLocale = locale;
  server.use(
    http.get(ENDPOINT, () =>
      HttpResponse.json({
        data: { items: ITEMS, page: { cursor: null, limit: 20, hasNext: false, ...page } },
      }),
    ),
  );
  const ui = await PublicVendorDirectory({ searchParams: {} });
  return renderWithProviders(<main>{ui}</main>, {
    messages: { vendor: CATALOG[locale] } as AbstractIntlMessages,
    locale,
  });
}

describe('directorio público · axe-core', () => {
  it.each(['es-LATAM', 'es-ES', 'pt', 'en'] as const)('sin violaciones en %s', async (locale) => {
    const { container, unmount } = await renderDirectory(locale);
    const { critical, otherViolations } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
    unmount();
  });

  it('sin violaciones con la paginación visible', async () => {
    const { container, unmount } = await renderDirectory('es-LATAM', {
      cursor: 'CURSOR_2',
      hasNext: true,
    });
    const { critical, otherViolations } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
    unmount();
  });
});

describe('directorio público · semántica', () => {
  it('tiene un único h1 y la lista de resultados tiene nombre accesible', async () => {
    const { container } = await renderDirectory('es-LATAM');
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(
      screen.getByRole('list', { name: esLatamVendor.directory.grid.ariaLabel }),
    ).toBeInTheDocument();
  });

  it('el formulario de filtros tiene nombre accesible y etiquetas asociadas', async () => {
    await renderDirectory('es-LATAM');
    const form = screen.getByRole('form', { name: esLatamVendor.directory.filters.formLabel });
    expect(form).toBeInTheDocument();
    for (const label of [
      esLatamVendor.directory.filters.category,
      esLatamVendor.directory.filters.location,
      esLatamVendor.directory.filters.currency,
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('el enlace de cada proveedor se distingue por el nombre del negocio', async () => {
    await renderDirectory('es-LATAM');
    // Nombres de enlace únicos: no hay tres «Ver más» indistinguibles fuera de contexto.
    expect(screen.getByRole('link', { name: 'Catering La Ceiba' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'DJ Luna' })).toBeInTheDocument();
  });
});
