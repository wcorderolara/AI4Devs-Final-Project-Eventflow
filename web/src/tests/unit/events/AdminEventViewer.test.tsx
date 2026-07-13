// US-016 / QA-001 (frontend) — Tests unitarios y a11y del viewer admin de evento.
// Cubre AC-03 (badge "Modo lectura", campos read-only, sin controles primarios), EC-01
// (banner soft-delete) y accesibilidad mínima (jest-axe sin violaciones).
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { AdminEventViewer } from '@/features/admin/events/components/AdminEventViewer';
import type { AdminEventModel } from '@/features/admin/events/api/adminEventsApi.types';

expect.extend(toHaveNoViolations);

import esLatamAdmin from '@/messages/es-LATAM/admin.json';
import esLatamEvents from '@/messages/es-LATAM/events.json';

const messages = { admin: esLatamAdmin, events: esLatamEvents };

function baseEvent(over: Partial<AdminEventModel> = {}): AdminEventModel {
  return {
    id: 'e-1',
    ownerId: 'org-1',
    eventTypeCode: 'wedding',
    name: 'Boda demo',
    eventDate: '2026-12-31',
    guestsCount: 100,
    locationId: 'loc-1',
    estimatedBudget: '1500.00',
    currencyCode: 'GTQ',
    languageCode: 'es-LATAM',
    status: 'active',
    notes: null,
    autoCompleted: false,
    completedAt: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    deletedAt: null,
    deleted: false,
    owner: { id: 'org-1', displayName: 'Organizer Demo' },
    ...over,
  };
}

function renderViewer(event: AdminEventModel): void {
  render(
    <NextIntlClientProvider locale="es-LATAM" messages={messages}>
      <AdminEventViewer event={event} />
    </NextIntlClientProvider>,
  );
}

describe('<AdminEventViewer>', () => {
  it('AC-03: renderiza badge "Modo lectura" e inputs `readOnly aria-readonly=true`', () => {
    renderViewer(baseEvent());
    expect(screen.getByTestId('admin-event-read-only-badge')).toHaveTextContent(/modo lectura/i);
    const readonlyInputs = document.querySelectorAll('input[readonly]');
    expect(readonlyInputs.length).toBeGreaterThan(0);
    readonlyInputs.forEach((input) => {
      expect(input.getAttribute('aria-readonly')).toBe('true');
    });
  });

  it('AC-03: no expone controles primarios de edición/cancelación', () => {
    renderViewer(baseEvent());
    expect(
      screen.queryByRole('button', { name: /(editar|cancelar|eliminar)/i }),
    ).toBeNull();
  });

  it('EC-01: cuando deleted=true muestra `DeletedEventBanner` con role="status" + aria-live=polite', () => {
    renderViewer(baseEvent({ deleted: true, deletedAt: '2026-06-01T00:00:00.000Z' }));
    const banner = screen.getByTestId('admin-event-deleted-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('QA-004 (a11y): axe no reporta violaciones sobre el viewer admin', async () => {
    const { container } = render(
      <NextIntlClientProvider locale="es-LATAM" messages={messages}>
        <AdminEventViewer event={baseEvent()} />
      </NextIntlClientProvider>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
