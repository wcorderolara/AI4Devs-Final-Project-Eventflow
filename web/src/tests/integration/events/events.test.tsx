// US-009..US-014 — feature events: listado (US-013), acciones cancelar (US-011) y eliminar
// borrador (US-012), dashboard (US-014) y asistente de creación (US-009) + axe.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import {
  CreateEventWizard,
  EventDashboardPage,
  EventsListPage,
} from '@/features/events';
import esLatamEvents from '@/messages/es-LATAM/events.json';
import esLatamNavigation from '@/messages/es-LATAM/navigation.json';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <NextIntlClientProvider locale="es-LATAM" messages={{ events: esLatamEvents, navigation: esLatamNavigation }}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe('US-013 — listado de eventos', () => {
  it('AC-02: renderiza los eventos propios con su estado', async () => {
    renderWithProviders(<EventsListPage />);
    expect(await screen.findByText('Boda de Ana')).toBeInTheDocument();
    // "Borrador" aparece en el badge de estado y en el filtro; basta con que exista al menos uno.
    expect(screen.getAllByText('Borrador').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Crear evento' })).toBeInTheDocument();
  });
});

describe('US-011 — cancelar evento', () => {
  it('AC-07: abrir el diálogo y confirmar cierra el modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventsListPage />);
    await screen.findByText('Boda de Ana');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Cancelar evento')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('US-012 — eliminar borrador', () => {
  it('AC-01: abrir el diálogo de eliminar y confirmar cierra el modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventsListPage />);
    await screen.findByText('Boda de Ana');

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Eliminar borrador')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('US-014 — dashboard de evento', () => {
  it('AC-01: renderiza el detalle del evento', async () => {
    renderWithProviders(<EventDashboardPage eventId="e1111111-1111-4111-8111-111111111111" />);
    expect(await screen.findByRole('heading', { name: 'Boda de Ana', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Tareas')).toBeInTheDocument();
  });
});

describe('US-009 — asistente de creación', () => {
  it('AC-01: renderiza el primer paso con selector de tipo', async () => {
    renderWithProviders(<CreateEventWizard />);
    expect(await screen.findByRole('heading', { name: 'Crear evento' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de evento')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeInTheDocument();
  });

  it('valida el paso 1 antes de avanzar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateEventWizard />);
    await screen.findByRole('heading', { name: 'Crear evento' });
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Selecciona un tipo de evento.')).toBeInTheDocument();
  });
});

describe('US-013 QA — accesibilidad', () => {
  it('sin violaciones críticas/serias de axe en el listado', async () => {
    const { container } = renderWithProviders(<EventsListPage />);
    await screen.findByText('Boda de Ana');
    const results = await axe(container);
    expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
