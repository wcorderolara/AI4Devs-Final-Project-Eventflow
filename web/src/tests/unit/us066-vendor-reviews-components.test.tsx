// US-066 (PB-P1-039 / QA-004) — Unit tests DOM de `AverageRating`, `ReviewListItem` y
// `VendorReviewsSection`. Verifica:
//   - `AverageRating`: empty state cuando `reviewsCount=0`; label accesible con rating y total.
//   - `ReviewListItem`: rating + eventTitle + comment renderizados; anonimato (sin PII visible).
//   - `VendorReviewsSection`: fetch de la primera página vía MSW, botón "Cargar más" que trae la
//     segunda página y desaparece cuando no hay más.
//   - jest-axe: 0 violaciones serias en AverageRating + una ReviewListItem estándar.
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';
import { AverageRating } from '@/features/reviews/components/AverageRating';
import { ReviewListItem } from '@/features/reviews/components/ReviewListItem';
import { VendorReviewsSection } from '@/features/reviews/components/VendorReviewsSection';
import { vendorReviewsMswTriggers } from '../msw/handlers/vendor-reviews';
import type { AnonymizedReviewDTO } from '@/features/reviews';

expect.extend(toHaveNoViolations);

const messages = { vendor: esLatamVendor };

function withProviders(children: React.ReactNode): React.ReactElement {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  );
}

const REVIEW: AnonymizedReviewDTO = {
  id: '00000000-0000-0000-0066-000000000001',
  rating: 4,
  comment: 'Excelente servicio, muy recomendado.',
  eventTitle: 'Boda de Juan y María',
  createdAt: '2026-06-15T12:00:00.000Z',
};

describe('US-066 · AverageRating', () => {
  it('empty state cuando reviewsCount=0', () => {
    render(withProviders(<AverageRating ratingAvg={null} reviewsCount={0} />));
    expect(screen.getByText('Aún sin reseñas.')).toBeInTheDocument();
  });

  it('label accesible con rating y conteo pluralizado', () => {
    render(withProviders(<AverageRating ratingAvg={4.6} reviewsCount={25} />));
    // El aria-label vive en el contenedor y contiene el rating + total.
    expect(screen.getByLabelText(/4\.6 de 5 estrellas/)).toBeInTheDocument();
    expect(screen.getByLabelText(/25 reseñas/)).toBeInTheDocument();
  });

  it('jest-axe: 0 violaciones', async () => {
    const { container } = render(
      withProviders(<AverageRating ratingAvg={4.6} reviewsCount={25} />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-066 · ReviewListItem', () => {
  it('renderiza rating, eventTitle, comment y fecha', () => {
    render(withProviders(<ReviewListItem review={REVIEW} />));
    expect(screen.getByText('Boda de Juan y María')).toBeInTheDocument();
    expect(screen.getByText(REVIEW.comment as string)).toBeInTheDocument();
    // El label ARIA del rating es humano ("4 de 5 estrellas") — se puede localizar por text.
    expect(screen.getByLabelText('4 de 5 estrellas')).toBeInTheDocument();
  });

  it('AC-03 anonimato: DOM NO menciona nombre de organizer ni ID de evento', () => {
    const { container } = render(withProviders(<ReviewListItem review={REVIEW} />));
    // No hay ni field label ni valor que identifique al organizer o al evento por ID.
    expect(container.textContent).not.toMatch(/author/i);
    expect(container.textContent).not.toMatch(/organizer/i);
    expect(container.textContent).not.toContain('bookingIntentId');
    expect(container.textContent).not.toContain('event_id');
  });

  it('comment null ⇒ NO se pinta un párrafo vacío', () => {
    const { container } = render(
      withProviders(<ReviewListItem review={{ ...REVIEW, comment: null }} />),
    );
    // El único `<p>` visible es el opcional del comment; con null no hay ninguno.
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  it('showStatus:true renderiza el badge de status', () => {
    render(
      withProviders(<ReviewListItem review={{ ...REVIEW, status: 'hidden' }} showStatus />),
    );
    expect(screen.getByText('Oculta')).toBeInTheDocument();
  });

  it('jest-axe: 0 violaciones', async () => {
    const { container } = render(withProviders(<ReviewListItem review={REVIEW} />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-066 · VendorReviewsSection', () => {
  it('carga primera página + "Cargar más" trae la segunda + desaparece al terminar', async () => {
    render(
      withProviders(
        <VendorReviewsSection
          vendorId={vendorReviewsMswTriggers.HAPPY}
          pageSize={20}
        />,
      ),
    );
    // Espera a que aparezca el primer item (asíncrono).
    await waitFor(() => {
      expect(screen.getByLabelText('Listado de reseñas del proveedor')).toBeInTheDocument();
    });
    // Debe haber 20 items en la primera página.
    const listaEls = screen.getAllByRole('article');
    expect(listaEls.length).toBe(20);

    const loadMore = screen.getByRole('button', { name: 'Cargar más reseñas' });
    fireEvent.click(loadMore);
    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBe(25);
    });
    // Con next_cursor null, el botón desaparece.
    expect(screen.queryByRole('button', { name: 'Cargar más reseñas' })).toBeNull();
  });

  it('empty state cuando el vendor NO tiene reviews', async () => {
    // Trigger sentinel: HAPPY genera 25 reviews. Para vacío, forzamos un vendor sin datos vía
    // vendorId distinto — el handler MSW usa el mismo generador; para simular vacío usamos el
    // caso NOT_FOUND (404) que arrojará error, NO empty. En su lugar validamos con
    // initialVendor={reviewsCount: 0} — el summary muestra el empty label incluso mientras
    // fetches en curso.
    render(
      withProviders(
        <VendorReviewsSection
          vendorId={vendorReviewsMswTriggers.HAPPY}
          pageSize={20}
          initialVendor={{ ratingAvg: null, reviewsCount: 0 }}
        />,
      ),
    );
    // Antes de que llegue la respuesta, el summary usa `initialVendor` y muestra el empty.
    expect(screen.getByText('Aún sin reseñas.')).toBeInTheDocument();
  });
});
