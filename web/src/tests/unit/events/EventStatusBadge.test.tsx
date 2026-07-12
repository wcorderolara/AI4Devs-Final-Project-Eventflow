// US-015 / FE-001 + QA-003 — Tests unit del EventStatusBadge y su cobertura a11y i18n.
// AC-06: variante `completed`, `aria-label` localizado y presencia en los 4 locales.
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { EventStatusBadge } from '@/features/events/components/EventStatusBadge';

expect.extend(toHaveNoViolations);

import esLatam from '@/messages/es-LATAM/events.json';
import esES from '@/messages/es-ES/events.json';
import pt from '@/messages/pt/events.json';
import en from '@/messages/en/events.json';

const CATALOGS = {
  'es-LATAM': { events: esLatam },
  'es-ES': { events: esES },
  pt: { events: pt },
  en: { events: en },
};

function renderBadge(locale: keyof typeof CATALOGS, status: 'draft' | 'active' | 'completed' | 'cancelled'): void {
  render(
    <NextIntlClientProvider locale={locale} messages={CATALOGS[locale]}>
      <EventStatusBadge status={status} />
    </NextIntlClientProvider>,
  );
}

describe('<EventStatusBadge>', () => {
  it('AC-06 (es-LATAM): renderiza la etiqueta "Completado" y aria-label localizado', () => {
    renderBadge('es-LATAM', 'completed');
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Completado');
    expect(badge).toHaveAccessibleName('Estado del evento: Completado');
  });

  it('AC-06 (es-ES): renderiza la etiqueta "Completado" y aria-label localizado', () => {
    renderBadge('es-ES', 'completed');
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Completado');
    expect(badge).toHaveAccessibleName('Estado del evento: Completado');
  });

  it('AC-06 (pt): renderiza la etiqueta "Concluído" y aria-label localizado', () => {
    renderBadge('pt', 'completed');
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Concluído');
    expect(badge).toHaveAccessibleName('Status do evento: Concluído');
  });

  it('AC-06 (en): renderiza la etiqueta "Completed" y aria-label localizado', () => {
    renderBadge('en', 'completed');
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Completed');
    expect(badge).toHaveAccessibleName('Event status: Completed');
  });

  it('AC-06: aplica la clase de color para el estado completed (contraste blue-800/100)', () => {
    renderBadge('en', 'completed');
    const badge = screen.getByRole('status');
    expect(badge.className).toMatch(/bg-blue-100/);
    expect(badge.className).toMatch(/text-blue-800/);
  });

  // QA-003 (AC-06): jest-axe sobre el badge renderizado. Cobertura mínima alineada con NFR-A11Y.
  it('QA-003: axe no reporta violaciones sobre el badge Completed', async () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={CATALOGS.en}>
        <EventStatusBadge status="completed" />
      </NextIntlClientProvider>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
