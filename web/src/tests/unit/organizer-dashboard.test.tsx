// Panel del organizador: el próximo evento encabeza la vista (o su estado vacío honesto) y las
// métricas se leen como una fila de cifras.
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizerDashboard } from '@/features/organizer/dashboard';
import organizerEs from '@/messages/es-LATAM/organizer.json';

const metrics = {
  events: { total: 5, byStatus: { draft: 1, active: 2, completed: 1, cancelled: 1 }, thisWeek: 0 },
  tasks: { pending: 4 },
  quotes: { requestsSent: 10, received: 0, accepted: 8 },
  bookings: { confirmed: 2 },
  reviews: { written: 5 },
  notifications: { unread: 1 },
  weekRange: { start: '2026-10-12T00:00:00.000Z', end: '2026-10-18T23:59:59.999Z' },
};

const DAY_MS = 86_400_000;
const inDays = (days: number): string =>
  `${new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10)}T00:00:00.000Z`;

let upcomingItems: Array<Record<string, unknown>> = [];

vi.mock('@/features/organizer/dashboard/hooks/useOrganizerMetrics', () => ({
  useOrganizerMetrics: () => ({
    data: metrics,
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/events', () => ({
  useEventsList: () => ({
    data: { items: upcomingItems, pagination: { page: 1, pageSize: 10, total: upcomingItems.length, totalPages: 1 } },
    isPending: false,
    refetch: vi.fn(),
  }),
  useEventTypes: () => ({ data: [{ code: 'wedding', label: 'Boda' }] }),
  useLocations: () => ({
    data: [{ id: 'loc-1', country: 'GT', region: 'Sacatepéquez', city: 'Antigua Guatemala' }],
  }),
}));

vi.mock('@/shared/auth-session', () => ({
  useSession: () => ({ user: { id: 'u1', email: 'a@b.com', displayName: 'María Fernanda López' } }),
}));

function renderDashboard() {
  return render(
    <NextIntlClientProvider locale="es-LATAM" messages={{ organizer: organizerEs }} timeZone="UTC">
      <OrganizerDashboard />
    </NextIntlClientProvider>,
  );
}

const event = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  ownerId: 'u1',
  eventTypeCode: 'wedding',
  name: 'Boda de Ana y Luis',
  eventDate: inDays(74),
  guestsCount: 120,
  locationId: 'loc-1',
  estimatedBudget: '85000.00',
  currencyCode: 'GTQ',
  languageCode: 'es-LATAM',
  status: 'active',
  notes: null,
  autoCompleted: false,
  completedAt: null,
  createdAt: inDays(-10),
  updatedAt: inDays(-10),
  ...overrides,
});

describe('OrganizerDashboard', () => {
  beforeEach(() => {
    upcomingItems = [];
  });

  it('saluda por el primer nombre', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { level: 1, name: 'Hola, María' })).toBeInTheDocument();
  });

  it('sin eventos próximos muestra el estado vacío con una sola acción de crear evento', () => {
    renderDashboard();
    const empty = screen.getByTestId('org-next-event-empty');
    expect(within(empty).getByRole('heading', { name: organizerEs.dashboard.nextEvent.emptyTitle })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: organizerEs.dashboard.nextEvent.emptyCta })).toHaveLength(1);
  });

  it('con un evento próximo muestra nombre, fecha, lugar y cuenta regresiva', () => {
    upcomingItems = [event()];
    renderDashboard();
    const card = screen.getByTestId('org-next-event');
    expect(within(card).getByRole('heading', { name: 'Boda de Ana y Luis' })).toBeInTheDocument();
    expect(card).toHaveTextContent('Faltan 74 días.');
    expect(card).toHaveTextContent('120 invitados');
    expect(card).toHaveTextContent('Antigua Guatemala, Sacatepéquez');
    expect(within(card).getByRole('link', { name: 'Abrir evento' })).toHaveAttribute('href', '/organizer/events/evt-1');
  });

  it('ignora eventos cancelados o completados al elegir el próximo', () => {
    upcomingItems = [event({ id: 'evt-0', name: 'Cancelado', status: 'cancelled', eventDate: inDays(3) }), event()];
    renderDashboard();
    expect(within(screen.getByTestId('org-next-event')).getByRole('heading', { name: 'Boda de Ana y Luis' })).toBeInTheDocument();
  });

  it('el día del evento la cuenta regresiva dice "Es hoy."', () => {
    upcomingItems = [event({ eventDate: inDays(0) })];
    renderDashboard();
    expect(screen.getByTestId('org-next-event')).toHaveTextContent('Es hoy.');
  });

  it('lee las métricas como cifras con su contexto', () => {
    renderDashboard();
    expect(within(screen.getByTestId('org-quotes')).getByText('10')).toBeInTheDocument();
    expect(screen.getByTestId('org-quotes')).toHaveTextContent('8 aceptadas, 0 por revisar');
    expect(screen.getByTestId('org-events')).toHaveTextContent('2 activos, 1 en borrador');
    expect(screen.getByLabelText('4 tareas pendientes')).toHaveTextContent('4');
  });
});
