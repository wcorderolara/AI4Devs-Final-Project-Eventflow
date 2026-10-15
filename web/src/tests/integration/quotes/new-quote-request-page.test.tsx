// Nueva solicitud de cotización: la URL sólo lleva `?vendor=<slug>&category=<code>`; evento,
// proveedor y categoría salen de la API (nada editable a mano en la URL llega a la pantalla).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { NewQuoteRequestPage } from '@/features/quotes';
import quotesEs from '@/messages/es-LATAM/quotes.json';
import { eventFixture } from '@/tests/msw/handlers/events';
import { server } from '@/tests/msw/server';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

const meta = { correlationId: 'req_test' };

function useVendor(categories: Array<{ code: string; name: string }>): void {
  server.use(
    http.get('*/api/v1/public/vendors/:slug', ({ params }) =>
      HttpResponse.json({
        data: {
          id: 'v1111111-1111-4111-8111-111111111111',
          slug: String(params.slug),
          businessName: 'Flores de la Sabana',
          bio: '',
          location: { display: 'Bogotá, Colombia', code: 'CO-DC' },
          categories,
          ratingAvg: 4.5,
          reviewsCount: 8,
          reviewsTotalPublished: 8,
          packages: [],
          portfolio: [],
          reviews: [],
        },
        meta,
      }),
    ),
    http.get('*/api/v1/service-categories', () =>
      HttpResponse.json({
        data: {
          tree: [],
          flat: [
            { id: 'c-flowers', code: 'flowers' },
            { id: 'c-decoration', code: 'decoration' },
          ],
        },
        meta,
      }),
    ),
  );
}

function renderPage(props: { vendorSlug: string | null; categoryCode?: string | null }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es-LATAM" messages={{ quotes: quotesEs }} timeZone="UTC">
        <NewQuoteRequestPage eventId={eventFixture.id} categoryCode={null} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('NewQuoteRequestPage', () => {
  it('sin proveedor invita a elegirlo en el directorio', () => {
    renderPage({ vendorSlug: null });
    expect(screen.getByText(quotesEs.create.pickVendor.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: quotesEs.create.pickVendor.cta })).toHaveAttribute(
      'href',
      '/organizer/vendors',
    );
    expect(screen.queryByRole('button', { name: quotesEs.create.actions.submit })).not.toBeInTheDocument();
  });

  it('muestra evento y proveedor leídos de la API y el formulario con su única categoría', async () => {
    useVendor([{ code: 'flowers', name: 'Flores' }]);
    renderPage({ vendorSlug: 'flores-de-la-sabana' });

    expect(await screen.findByText('Flores de la Sabana')).toBeInTheDocument();
    expect(screen.getByText(eventFixture.name)).toBeInTheDocument();
    expect(screen.getByText('Flores')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: quotesEs.create.actions.submit })).toBeInTheDocument();
    // Una sola categoría: no hace falta elegir.
    expect(screen.queryByLabelText(new RegExp(quotesEs.create.category.label))).not.toBeInTheDocument();
  });

  it('con varias categorías y sin `category` en la URL, pide elegir antes de mostrar el formulario', async () => {
    useVendor([
      { code: 'flowers', name: 'Flores' },
      { code: 'decoration', name: 'Decoración' },
    ]);
    renderPage({ vendorSlug: 'flores-de-la-sabana' });

    const select = await screen.findByLabelText(new RegExp(quotesEs.create.category.label));
    expect(screen.queryByRole('button', { name: quotesEs.create.actions.submit })).not.toBeInTheDocument();

    await userEvent.selectOptions(select, 'decoration');
    expect(await screen.findByRole('button', { name: quotesEs.create.actions.submit })).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getAllByText('Decoración').length).toBeGreaterThan(0);
  });

  it('`category` de la URL preselecciona la categoría si el proveedor la ofrece', async () => {
    useVendor([
      { code: 'flowers', name: 'Flores' },
      { code: 'decoration', name: 'Decoración' },
    ]);
    renderPage({ vendorSlug: 'flores-de-la-sabana', categoryCode: 'decoration' });
    expect(await screen.findByRole('button', { name: quotesEs.create.actions.submit })).toBeInTheDocument();
  });

  it('proveedor inexistente → error con salida al directorio', async () => {
    server.use(
      http.get('*/api/v1/public/vendors/:slug', () =>
        HttpResponse.json({ error: { code: 'VENDOR_NOT_FOUND', message: 'x' } }, { status: 404 }),
      ),
    );
    renderPage({ vendorSlug: 'no-existe' });
    expect(await screen.findByText(quotesEs.create.loadError.title)).toBeInTheDocument();
  });
});
