// Comparador: el CTA «Resumir con IA» de la tabla abre el panel de resumen del propio comparador
// (antes enlazaba a `/quotes/compare/ai-summary`, una ruta que no existe).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { QuoteComparator } from '@/features/quotes';
import esLatamOrganizer from '@/messages/es-LATAM/organizer.json';

const EVENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

function renderComparator() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es-LATAM" messages={{ organizer: esLatamOrganizer }} timeZone="UTC">
        <QuoteComparator eventId={EVENT_ID} categoryCode="catering" />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('QuoteComparator — CTA «Resumir con IA»', () => {
  it('reabre el panel de resumen y le lleva el foco, sin navegar', async () => {
    renderComparator();
    const trigger = await screen.findByTestId('ai-quote-summary-trigger');
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));

    // La persona cierra el panel…
    await userEvent.click(trigger);
    expect(document.getElementById('ai-quote-summary-panel-region')).toBeNull();

    // …y lo vuelve a abrir desde el CTA de la tabla.
    const [tableCta] = screen.getAllByRole('button', { name: esLatamOrganizer.quote.compare.table.aiSummaryCta });
    await userEvent.click(tableCta!);
    const region = await waitFor(() => {
      const el = document.getElementById('ai-quote-summary-panel-region');
      expect(el).not.toBeNull();
      return el!;
    });
    await waitFor(() => expect(document.activeElement).toBe(region));
    expect(screen.queryByRole('link', { name: esLatamOrganizer.quote.compare.table.aiSummaryCta })).toBeNull();
  });
});
