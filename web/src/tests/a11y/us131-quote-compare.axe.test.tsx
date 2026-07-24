// US-131 / PB-P2-019 — QA-001. Auditoría axe-core de la ruta demo
// `/organizer/events/[eventId]/quotes/compare` (AC-01, TS-01, VR-02). Monta
// `QuoteComparisonTable` (US-057) con dos ítems representativos (sent + accepted) y verifica 0
// violaciones críticas. La tabla es el corazón semántico de la vista (`<table>`, `<caption>`,
// `scope="col"`/`scope="row"`, `aria-labelledby` implícito por vendor).
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import esLatamQuotes from '@/messages/es-LATAM/organizer.json';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import { QuoteComparisonTable } from '@/features/quotes/components/QuoteComparisonTable';
import type { CompareQuoteItemView } from '@/features/quotes/api/quotesApi.types';
import { auditA11y, formatViolations } from './helpers/axe';
import { renderWithProviders } from './helpers/render-with-intl';

// `PreferredToggleButton` puede usar `useRouter` para deep-links — mock defensivo consistente.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const items: CompareQuoteItemView[] = [
  {
    quoteId: '11111111-1111-4111-8111-111111111111',
    vendor: { profileId: 'v1', businessName: 'Catering Aurora', slug: 'catering-aurora', ratingAvg: 4.7, reviewsCount: 12 },
    status: 'sent',
    totalPrice: '18000.00',
    breakdown: [
      { label: 'Menú principal', amount: '15000.00' },
      { label: 'Servicio de meseros', amount: '3000.00' },
    ],
    validUntil: '2026-12-01',
    conditions: 'Pago 50% anticipo.',
    isPreferred: false,
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    quoteId: '22222222-2222-4222-8222-222222222222',
    vendor: { profileId: 'v2', businessName: 'Banquetes Sol', slug: 'banquetes-sol', ratingAvg: 4.4, reviewsCount: 30 },
    status: 'accepted',
    totalPrice: '19500.00',
    breakdown: [{ label: 'Paquete premium', amount: '19500.00' }],
    validUntil: null,
    conditions: null,
    isPreferred: true,
    createdAt: '2026-07-02T00:00:00.000Z',
  },
];

const messages = { organizer: esLatamQuotes, common: esLatamCommon };

describe('US-131 QA-001 · axe /organizer/events/:id/quotes/compare (QuoteComparisonTable)', () => {
  it('AC-01 · TS-01: comparativa con 2 vendors (sent + accepted preferred) sin violaciones críticas', async () => {
    const { container } = renderWithProviders(
      <QuoteComparisonTable
        eventId="e0000000-0000-4000-8000-000000000000"
        categoryCode="catering"
        categoryName="Catering"
        currencyCode="GTQ"
        items={items}
      />,
      { messages },
    );
    const { critical } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
  });
});
