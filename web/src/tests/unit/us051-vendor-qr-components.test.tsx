// US-051 (PB-P1-031 / QA-004 A11Y) — Unit tests DOM de componentes vendor QR.
// Verifica:
//   - `StatusBadge`: renderiza etiqueta traducida y expone `aria-live="polite"` (AC A11Y).
//   - `EventBriefSnapshot`: acepta shape US-049 y shape US-096 legada; empty-state accesible.
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';
import { StatusBadge } from '@/features/quotes/components/StatusBadge';
import { EventBriefSnapshot } from '@/features/quotes/components/EventBriefSnapshot';

const messages = { vendor: esLatamVendor };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

describe('US-051 · StatusBadge', () => {
  it('renderiza la etiqueta traducida y expone aria-live="polite"', () => {
    const { container } = render(withIntl(<StatusBadge status="sent" />));
    const badge = container.querySelector('[data-status="sent"]');
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute('aria-live')).toBe('polite');
    expect(badge?.textContent).toBe('Enviada');
  });

  it('renderiza cada estado con su etiqueta i18n propia', () => {
    for (const [status, expected] of [
      ['viewed', 'Vista'],
      ['responded', 'Respondida'],
      ['expired', 'Vencida'],
      ['cancelled', 'Cancelada'],
    ] as const) {
      const { container, unmount } = render(withIntl(<StatusBadge status={status} />));
      const badge = container.querySelector(`[data-status="${status}"]`);
      expect(badge?.textContent).toBe(expected);
      unmount();
    }
  });
});

describe('US-051 · EventBriefSnapshot', () => {
  it('renderiza campos US-049 (budget + event_snapshot)', () => {
    render(
      withIntl(
        <EventBriefSnapshot
          brief={{
            budget: '10000',
            currency_code: 'GTQ',
            message: 'Hola, este es un mensaje.',
            event_snapshot: {
              event_type_id: 'x',
              event_date: '2026-12-01',
              location_id: null,
              guests_count: 120,
            },
          }}
        />,
      ),
    );
    expect(screen.getByText('10000 GTQ')).toBeTruthy();
    expect(screen.getByText('Hola, este es un mensaje.')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
  });

  it('renderiza campos legado US-096 (summary + requirements + questions)', () => {
    render(
      withIntl(
        <EventBriefSnapshot
          brief={{
            summary: 'Resumen',
            requirements: ['Req 1', 'Req 2'],
            questions: ['¿Q1?'],
          }}
        />,
      ),
    );
    expect(screen.getByText('Resumen')).toBeTruthy();
    expect(screen.getByText('Req 1')).toBeTruthy();
    expect(screen.getByText('¿Q1?')).toBeTruthy();
  });

  it('muestra empty-state accesible cuando el brief es null', () => {
    render(withIntl(<EventBriefSnapshot brief={null} />));
    expect(screen.getByText('El organizador no adjuntó contexto adicional.')).toBeTruthy();
  });
});
