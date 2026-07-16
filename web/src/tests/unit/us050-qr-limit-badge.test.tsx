// US-050 (PB-P1-030 / QA-004 A11Y) — Unit tests DOM del `QRLimitBadge`.
// Verifica: aria-live="polite" siempre; texto pluralizado por i18n; render de `role="alert"` +
// `id=qr-limit-reason` sólo cuando `available_slots=0`; error de red ⇒ badge oculto.
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import esLatamQuotes from '@/messages/es-LATAM/quotes.json';
import { QRLimitBadge, QR_LIMIT_REASON_ID } from '@/features/quotes/components/QRLimitBadge';
import { quotesActiveCountMswTriggers } from '../msw/handlers/quotes';

const messages = { quotes: esLatamQuotes };

const EVENT_ID_ZERO = '99999999-9999-9999-9999-999999999999';
const CATEGORY = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function withProviders(children: React.ReactNode): React.ReactElement {
  // QueryClient nuevo por test para aislar cache entre casos.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('US-050 · QRLimitBadge', () => {
  it('sin IDs no renderiza nada (query deshabilitada)', () => {
    const { container } = render(
      withProviders(<QRLimitBadge eventId={undefined} serviceCategoryId={undefined} />),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('con 0 activas muestra "0/5" sin `role="alert"` y con `aria-live="polite"`', async () => {
    render(
      withProviders(<QRLimitBadge eventId={EVENT_ID_ZERO} serviceCategoryId={CATEGORY} />),
    );
    await waitFor(() => {
      expect(screen.getByText(/0\/5/)).toBeInTheDocument();
    });
    // Contenedor con aria-live="polite"
    expect(screen.getByText(/0\/5/).parentElement).toHaveAttribute('aria-live', 'polite');
    // No hay alerta bloqueadora todavía
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.getElementById(QR_LIMIT_REASON_ID)).toBeNull();
  });

  it('con 5 activas muestra el `role="alert"` con id `qr-limit-reason` (consumido por CTA)', async () => {
    render(
      withProviders(
        <QRLimitBadge eventId={quotesActiveCountMswTriggers.COUNT_FIVE} serviceCategoryId={CATEGORY} />,
      ),
    );
    await waitFor(() => {
      expect(screen.getByText(/5\/5/)).toBeInTheDocument();
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('id', QR_LIMIT_REASON_ID);
    expect(alert.textContent).toBeTruthy();
  });

  it('con 4 activas NO renderiza el alert (available_slots=1)', async () => {
    render(
      withProviders(
        <QRLimitBadge eventId={quotesActiveCountMswTriggers.COUNT_FOUR} serviceCategoryId={CATEGORY} />,
      ),
    );
    await waitFor(() => {
      expect(screen.getByText(/4\/5/)).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ante 404/401/403 ⇒ badge oculto (backend re-valida en POST)', async () => {
    const { container } = render(
      withProviders(
        <QRLimitBadge
          eventId={quotesActiveCountMswTriggers.EVENT_NOT_FOUND}
          serviceCategoryId={CATEGORY}
        />,
      ),
    );
    // Espera a que la query complete (isLoading pasa a false) y verifica que no hay contenido.
    await waitFor(() => {
      expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    });
    expect(screen.queryByText(/\/5/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
