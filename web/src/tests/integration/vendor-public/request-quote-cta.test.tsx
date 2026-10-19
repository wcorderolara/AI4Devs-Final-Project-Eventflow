// CTA «Pedir cotización» del perfil público: entrada al flujo de solicitud de cotización según la
// sesión (organizador elige evento activo; anónimo va al login; proveedor/admin no lo ven).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequestQuoteCta } from '@/features/vendor-public/components/RequestQuoteCta';
import { SessionContext, type SessionState } from '@/shared/auth-session';
import publicVendorEs from '@/messages/es-LATAM/public-vendor.json';
import { eventFixture } from '@/tests/msw/handlers/events';
import { server } from '@/tests/msw/server';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

afterEach(() => push.mockClear());

const t = publicVendorEs.requestQuote;

function session(role: SessionState['role']): SessionState {
  return { user: null, role, isAuthenticated: role !== null, isLoading: false, isError: false, refetch: () => {} };
}

function activeEvents(count: number): void {
  const items = Array.from({ length: count }, (_, i) => ({
    ...eventFixture,
    id: `e000000${i}-1111-4111-8111-111111111111`,
    name: `Evento ${i + 1}`,
    status: 'active',
  }));
  server.use(
    http.get('*/api/v1/events', ({ request }) => {
      expect(new URL(request.url).searchParams.get('status')).toBe('active');
      return HttpResponse.json({
        data: items,
        pagination: { page: 1, pageSize: 50, total: count, totalPages: 1 },
        meta: { correlationId: 'r' },
      });
    }),
  );
}

function renderCta(role: SessionState['role']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es-LATAM" messages={{ publicVendor: publicVendorEs }} timeZone="UTC">
        <SessionContext.Provider value={session(role)}>
          <RequestQuoteCta vendorSlug="flores-de-la-sabana" />
        </SessionContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('RequestQuoteCta', () => {
  it('sin sesión lleva al login y vuelve al perfil', () => {
    renderCta(null);
    expect(screen.getByRole('link', { name: t.cta })).toHaveAttribute(
      'href',
      `/login?from=${encodeURIComponent('/vendors/flores-de-la-sabana')}`,
    );
  });

  it.each(['vendor', 'admin'] as const)('%s no ve el CTA', (role) => {
    renderCta(role);
    expect(screen.queryByText(t.cta)).not.toBeInTheDocument();
  });

  it('organizador con un único evento activo va directo a la solicitud', async () => {
    activeEvents(1);
    renderCta('organizer');
    const button = screen.getByRole('button', { name: t.cta });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    expect(push).toHaveBeenCalledWith(
      '/organizer/events/e0000000-1111-4111-8111-111111111111/quotes/new?vendor=flores-de-la-sabana',
    );
  });

  it('organizador con varios eventos activos elige el evento en un diálogo', async () => {
    activeEvents(2);
    renderCta('organizer');
    const button = screen.getByRole('button', { name: t.cta });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    expect(await screen.findByRole('dialog', { name: t.dialog.title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Evento 2/ }));
    await userEvent.click(screen.getByRole('button', { name: t.dialog.continue }));
    expect(push).toHaveBeenCalledWith(
      '/organizer/events/e0000001-1111-4111-8111-111111111111/quotes/new?vendor=flores-de-la-sabana',
    );
  });

  it('organizador sin eventos activos recibe la explicación y el camino a sus eventos', async () => {
    activeEvents(0);
    renderCta('organizer');
    const button = screen.getByRole('button', { name: t.cta });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    expect(await screen.findByRole('dialog', { name: t.noActive.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.noActive.cta })).toHaveAttribute('href', '/organizer/events');
    expect(push).not.toHaveBeenCalled();
  });
});
