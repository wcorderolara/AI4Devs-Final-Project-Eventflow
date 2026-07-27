// Directorio público `/vendors` — antes un placeholder «Próximamente», ahora datos reales de
// `GET /public/vendors`.
//
// Lo que se protege: que el listado se renderice en servidor (es superficie SEO y debe funcionar
// sin JavaScript), que las tarjetas lleven al perfil público, que la paginación sea navegable por
// enlaces, y que un filtro inválido se distinga de una caída del backend.
import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { PublicVendorDirectory, publicVendorDirectoryApi } from '@/features/vendor-public';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';
import { server } from '@/tests/msw/server';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// `PublicVendorDirectory` es async y usa `getTranslations` de next-intl/server, que necesita
// contexto de request. Se resuelve contra el catálogo real: si una clave desaparece, falla.
vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => {
    const path = namespace.split('.');
    let node: unknown = { vendor: esLatamVendor };
    for (const key of path) node = (node as Record<string, unknown>)[key];
    return (key: string) => {
      let value: unknown = node;
      for (const part of key.split('.')) value = (value as Record<string, unknown>)[part];
      return value as string;
    };
  },
}));

const ENDPOINT = '*/api/v1/public/vendors';

function vendor(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'catering-la-ceiba',
    businessName: 'Catering La Ceiba',
    locationCode: 'GT-GUA',
    categories: ['catering'],
    ratingAvg: 4.7,
    reviewsCount: 12,
    priceRange: { min: '200.00', max: '800.00', currency: 'GTQ' },
    thumbnailUrl: null,
    ...overrides,
  };
}

function respondWith(items: unknown[], page: Record<string, unknown> = {}) {
  server.use(
    http.get(ENDPOINT, () =>
      HttpResponse.json({
        data: { items, page: { cursor: null, limit: 20, hasNext: false, ...page } },
      }),
    ),
  );
}

async function renderDirectory(searchParams = {}) {
  const ui = await PublicVendorDirectory({ searchParams });
  return render(
    <NextIntlClientProvider locale="es-LATAM" messages={{ vendor: esLatamVendor }} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('directorio público — listado', () => {
  it('renderiza los proveedores que devuelve el backend', async () => {
    respondWith([
      vendor(),
      vendor({
        id: '22222222-2222-2222-2222-222222222222',
        slug: 'dj-luna',
        businessName: 'DJ Luna',
      }),
    ]);

    const { container } = await renderDirectory();

    expect(
      screen.getByRole('heading', { level: 1, name: esLatamVendor.directory.title }),
    ).toBeInTheDocument();
    const list = within(container).getByRole('list', {
      name: esLatamVendor.directory.grid.ariaLabel,
    });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Catering La Ceiba')).toBeInTheDocument();
    expect(screen.getByText('DJ Luna')).toBeInTheDocument();
  });

  it('cada tarjeta enlaza al perfil público del proveedor', async () => {
    respondWith([vendor()]);

    await renderDirectory();

    expect(screen.getByRole('link', { name: 'Catering La Ceiba' })).toHaveAttribute(
      'href',
      '/vendors/catering-la-ceiba',
    );
  });

  it('muestra el estado vacío cuando no hay resultados', async () => {
    respondWith([]);

    await renderDirectory();

    expect(screen.getByText(esLatamVendor.directory.empty.body)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: esLatamVendor.directory.empty.cta })).toHaveAttribute(
      'href',
      '/vendors',
    );
  });
});

describe('directorio público — paginación', () => {
  it('la siguiente página es un enlace navegable, no un botón de JavaScript', async () => {
    respondWith([vendor()], { cursor: 'CURSOR_2', hasNext: true });

    await renderDirectory();

    // Enlace real: rastreable, compartible y funcional sin JS.
    expect(
      screen.getByRole('link', { name: esLatamVendor.directory.loadMore.label }),
    ).toHaveAttribute('href', '/vendors?cursor=CURSOR_2');
  });

  it('el enlace de la siguiente página conserva los filtros activos', async () => {
    respondWith([vendor()], { cursor: 'CURSOR_2', hasNext: true });

    await renderDirectory({ categoryCode: 'catering', locationCode: 'GT-GUA' });

    const href = screen
      .getByRole('link', { name: esLatamVendor.directory.loadMore.label })
      .getAttribute('href') as string;
    expect(href).toContain('categoryCode=catering');
    expect(href).toContain('locationCode=GT-GUA');
    expect(href).toContain('cursor=CURSOR_2');
  });

  it('no ofrece siguiente página cuando no la hay', async () => {
    respondWith([vendor()], { cursor: null, hasNext: false });

    await renderDirectory();

    expect(
      screen.queryByRole('link', { name: esLatamVendor.directory.loadMore.label }),
    ).not.toBeInTheDocument();
  });
});

describe('directorio público — estados de fallo', () => {
  it('un filtro inválido se explica como tal, no como una caída', async () => {
    server.use(
      http.get(ENDPOINT, () =>
        HttpResponse.json({ error: { code: 'INVALID_FILTERS' } }, { status: 400 }),
      ),
    );

    await renderDirectory({ categoryCode: 'no-existe' });

    expect(screen.getByText(esLatamVendor.directory.invalidFilters)).toBeInTheDocument();
    expect(screen.queryByText(esLatamVendor.directory.error)).not.toBeInTheDocument();
  });

  it('un fallo del backend muestra el error genérico', async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.json({}, { status: 500 })));

    await renderDirectory();

    expect(screen.getByText(esLatamVendor.directory.error)).toBeInTheDocument();
  });

  it('un fallo de red no rompe la página', async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.error()));

    await expect(renderDirectory()).resolves.toBeDefined();
    expect(screen.getByText(esLatamVendor.directory.error)).toBeInTheDocument();
  });
});

describe('publicVendorDirectoryApi', () => {
  it('serializa sólo los filtros con valor', async () => {
    let received = '';
    server.use(
      http.get(ENDPOINT, ({ request }) => {
        received = new URL(request.url).search;
        return HttpResponse.json({
          data: { items: [], page: { cursor: null, limit: 20, hasNext: false } },
        });
      }),
    );

    await publicVendorDirectoryApi.list({ categoryCode: 'catering', locationCode: undefined });

    expect(received).toContain('categoryCode=catering');
    expect(received).not.toContain('locationCode');
  });

  it('distingue 400 (filtros) de otros errores', async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.json({}, { status: 400 })));
    expect((await publicVendorDirectoryApi.list()).status).toBe('invalid_filters');

    server.use(http.get(ENDPOINT, () => HttpResponse.json({}, { status: 503 })));
    expect((await publicVendorDirectoryApi.list()).status).toBe('error');
  });

  it('no envía credenciales: es un endpoint anónimo', async () => {
    let hadCookie = true;
    server.use(
      http.get(ENDPOINT, ({ request }) => {
        hadCookie = request.headers.has('cookie');
        return HttpResponse.json({
          data: { items: [], page: { cursor: null, limit: 20, hasNext: false } },
        });
      }),
    );

    await publicVendorDirectoryApi.list();

    expect(hadCookie).toBe(false);
  });
});
