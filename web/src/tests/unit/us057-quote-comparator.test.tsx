// US-057 (PB-P1-035 / QA-004) — Unit tests DOM + a11y del comparador de Quotes.
// Verifica:
//   - `QuoteComparisonTable`: semántica de tabla accesible (`<table>`, `<caption>` sr-only,
//     `<th scope="col">`, `<th scope="row">`), CTAs correctos, quotes expired/rejected como
//     "no seleccionable" (aria-label explícito), CTA "Resumir con IA" sólo con ≥2 quotes.
//   - `QuoteComparisonCards`: cada card es `<article>` con `aria-labelledby` al nombre del vendor.
//   - `QuoteStatusIndicator`: badge accesible con `aria-label` traducido; indicador preferred
//     aparte para no depender del glifo ★.
//   - jest-axe: 0 violaciones serias en las 3 vistas (table, cards, indicator).
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import esLatamOrganizer from '@/messages/es-LATAM/organizer.json';
import {
  QuoteComparisonTable,
  QuoteComparisonCards,
  QuoteStatusIndicator,
} from '@/features/quotes';
import type { CompareQuoteItemView } from '@/features/quotes';

expect.extend(toHaveNoViolations);

const messages = { organizer: esLatamOrganizer };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

const EVENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const CATEGORY = 'catering';

function baseItem(overrides: Partial<CompareQuoteItemView>): CompareQuoteItemView {
  return {
    quoteId: 'q1',
    vendor: {
      profileId: 'v1',
      businessName: 'Catering Aurora',
      slug: 'catering-aurora',
      ratingAvg: 4.6,
      reviewsCount: 24,
    },
    status: 'sent',
    totalPrice: '5000.00',
    breakdown: [{ label: 'Menú', amount: '5000.00' }],
    validUntil: '2026-08-01T00:00:00.000Z',
    conditions: 'Requiere anticipo.',
    isPreferred: false,
    createdAt: '2026-07-01T12:00:00.000Z',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QuoteStatusIndicator
// ─────────────────────────────────────────────────────────────────────────────
describe('US-057 · QuoteStatusIndicator', () => {
  it('badge para status "sent" con aria-label traducido', () => {
    render(withIntl(<QuoteStatusIndicator status="sent" />));
    expect(screen.getByLabelText('Enviada')).toBeInTheDocument();
  });

  it('quote preferida: incluye un badge aparte con aria-label', () => {
    render(withIntl(<QuoteStatusIndicator status="sent" isPreferred />));
    expect(screen.getByLabelText('Cotización preferida')).toBeInTheDocument();
    expect(screen.getByLabelText('Enviada')).toBeInTheDocument();
  });

  it('status "expired" con clases neutras (aria-label explícito)', () => {
    render(withIntl(<QuoteStatusIndicator status="expired" />));
    expect(screen.getByLabelText('Vencida')).toBeInTheDocument();
  });

  it('axe: 0 violaciones en badge preferred+sent', async () => {
    const { container } = render(withIntl(<QuoteStatusIndicator status="sent" isPreferred />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QuoteComparisonTable (desktop)
// ─────────────────────────────────────────────────────────────────────────────
describe('US-057 · QuoteComparisonTable', () => {
  const items: CompareQuoteItemView[] = [
    baseItem({
      quoteId: 'q1',
      vendor: {
        profileId: 'v1',
        businessName: 'Catering Aurora',
        slug: 'catering-aurora',
        ratingAvg: 4.8,
        reviewsCount: 42,
      },
      totalPrice: '4500.00',
      isPreferred: true,
    }),
    baseItem({
      quoteId: 'q2',
      vendor: {
        profileId: 'v2',
        businessName: 'Catering Bellavista',
        slug: 'catering-bellavista',
        ratingAvg: 4.2,
        reviewsCount: 8,
      },
      totalPrice: '5000.00',
    }),
    baseItem({
      quoteId: 'q3',
      status: 'expired',
      vendor: {
        profileId: 'v3',
        businessName: 'Catering Cielo',
        slug: null,
        ratingAvg: null,
        reviewsCount: 0,
      },
    }),
  ];

  it('renderiza tabla con caption sr-only + th scope=col para cada vendor', () => {
    render(
      withIntl(
        <QuoteComparisonTable
          eventId={EVENT_ID}
          categoryCode={CATEGORY}
          categoryName="Catering"
          currencyCode="GTQ"
          items={items}
        />,
      ),
    );
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    // Caption sr-only con `Catering`.
    expect(table.querySelector('caption')).toHaveTextContent(/Catering/);
    // Cabecera de columna: `Proveedor` + 3 vendors.
    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders.length).toBe(4);
  });

  it('AC-01: quote preferred exhibe indicador "Cotización preferida"', () => {
    render(
      withIntl(
        <QuoteComparisonTable
          eventId={EVENT_ID}
          categoryCode={CATEGORY}
          categoryName="Catering"
          currencyCode="GTQ"
          items={items}
        />,
      ),
    );
    expect(screen.getAllByLabelText('Cotización preferida').length).toBeGreaterThanOrEqual(1);
  });

  it('EC-04: quote expired ⇒ CTA "No seleccionable" con aria-label explícito (no permite marcar preferred)', () => {
    render(
      withIntl(
        <QuoteComparisonTable
          eventId={EVENT_ID}
          categoryCode={CATEGORY}
          categoryName="Catering"
          currencyCode="GTQ"
          items={items}
        />,
      ),
    );
    // El aria-label incluye el status → 3 quotes: q1(sent), q2(sent) tienen "Marcar preferred";
    // q3(expired) tiene "No seleccionable".
    const notSelectable = screen.getByLabelText(/no seleccionable/i);
    expect(notSelectable).toHaveTextContent('No seleccionable');
    // Los 2 activos exponen link "Marcar preferred".
    const preferCtas = screen.getAllByRole('link', { name: /Marcar la cotización de/i });
    expect(preferCtas).toHaveLength(2);
  });

  it('AC-04: CTA "Resumir con IA" presente con ≥2 quotes', () => {
    render(
      withIntl(
        <QuoteComparisonTable
          eventId={EVENT_ID}
          categoryCode={CATEGORY}
          categoryName="Catering"
          currencyCode="GTQ"
          items={items}
        />,
      ),
    );
    const ai = screen.getByRole('link', { name: 'Resumir con IA' });
    expect(ai).toHaveAttribute(
      'href',
      `/organizer/events/${EVENT_ID}/quotes/compare/ai-summary?categoryCode=${CATEGORY}`,
    );
  });

  it('AC-04: CTA "Resumir con IA" ausente con 1 quote', () => {
    render(
      withIntl(
        <QuoteComparisonTable
          eventId={EVENT_ID}
          categoryCode={CATEGORY}
          categoryName="Catering"
          currencyCode="GTQ"
          items={[items[0] as CompareQuoteItemView]}
        />,
      ),
    );
    expect(screen.queryByRole('link', { name: 'Resumir con IA' })).toBeNull();
  });

  it('CTA "Marcar preferred" enlaza a la ruta de US-058', () => {
    render(
      withIntl(
        <QuoteComparisonTable
          eventId={EVENT_ID}
          categoryCode={CATEGORY}
          categoryName="Catering"
          currencyCode="GTQ"
          items={items}
        />,
      ),
    );
    const link = screen.getByRole('link', {
      name: 'Marcar la cotización de Catering Aurora como preferred',
    });
    expect(link).toHaveAttribute('href', `/organizer/events/${EVENT_ID}/quotes/q1/prefer`);
  });

  it('axe: 0 violaciones serias en la tabla desktop', async () => {
    const { container } = render(
      withIntl(
        <QuoteComparisonTable
          eventId={EVENT_ID}
          categoryCode={CATEGORY}
          categoryName="Catering"
          currencyCode="GTQ"
          items={items}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QuoteComparisonCards (mobile)
// ─────────────────────────────────────────────────────────────────────────────
describe('US-057 · QuoteComparisonCards', () => {
  const items: CompareQuoteItemView[] = [
    baseItem({ quoteId: 'q1', vendor: { ...baseItem({ quoteId: 'q1' }).vendor, businessName: 'Vendor A' } }),
    baseItem({ quoteId: 'q2', vendor: { ...baseItem({ quoteId: 'q1' }).vendor, businessName: 'Vendor B' } }),
  ];

  it('cada quote se renderiza como <article> con aria-labelledby al nombre del vendor', () => {
    render(
      withIntl(
        <QuoteComparisonCards
          eventId={EVENT_ID}
          categoryCode={CATEGORY}
          categoryName="Catering"
          currencyCode="GTQ"
          items={items}
        />,
      ),
    );
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(2);
    for (const art of articles) {
      const labelledBy = art.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      // useId() generates IDs like `:r0:` which are invalid CSS selectors; use getElementById.
      const heading = art.ownerDocument.getElementById(labelledBy as string);
      expect(heading).not.toBeNull();
      expect(art.contains(heading)).toBe(true);
    }
    expect(within(articles[0] as HTMLElement).getByText('Vendor A')).toBeInTheDocument();
  });

  it('axe: 0 violaciones serias en las cards mobile', async () => {
    const { container } = render(
      withIntl(
        <QuoteComparisonCards
          eventId={EVENT_ID}
          categoryCode={CATEGORY}
          categoryName="Catering"
          currencyCode="GTQ"
          items={items}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
