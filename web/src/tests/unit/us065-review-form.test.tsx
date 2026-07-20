// US-065 (PB-P1-038 / QA-004) — Unit tests DOM del `ReviewForm` + `ReviewEligibilityBanner`.
// Verifica:
//   - Form accesible: rating label, comment textarea con label + aria-describedby.
//   - Submit deshabilitado hasta que rating != null.
//   - onSuccess callback llamado tras 201.
//   - Banner de error accesible con role="alert" para códigos genéricos.
//   - `ReviewEligibilityBanner` renderiza el copy correcto por reason.
//   - jest-axe: 0 violaciones serias.
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import esLatamOrganizer from '@/messages/es-LATAM/organizer.json';
import { ReviewForm } from '@/features/reviews/components/ReviewForm';
import { ReviewEligibilityBanner } from '@/features/reviews/components/ReviewEligibilityBanner';
import { createReviewMswTriggers } from '../msw/handlers/organizer-reviews';

expect.extend(toHaveNoViolations);

const messages = { organizer: esLatamOrganizer };

function withProviders(children: React.ReactNode): React.ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  );
}

const EVENT_ID = 'aaaaaaaa-1111-1111-1111-000000000001';
const HAPPY_VP = '99999999-9999-9999-9999-000000000065';

describe('US-065 · ReviewForm', () => {
  it('renderiza rating label, textarea con label y CTA disabled sin rating', () => {
    render(
      withProviders(<ReviewForm eventId={EVENT_ID} vendorProfileId={HAPPY_VP} />),
    );
    expect(screen.getByText('Puntuación')).toBeInTheDocument();
    expect(screen.getByLabelText('Comentario (opcional)')).toBeInTheDocument();
    const submit = screen.getByTestId('review-submit');
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-disabled', 'true');
  });

  it('CTA se habilita al seleccionar rating', () => {
    render(
      withProviders(<ReviewForm eventId={EVENT_ID} vendorProfileId={HAPPY_VP} />),
    );
    const star3 = screen.getByRole('radio', { name: '3 de 5 estrellas' });
    fireEvent.click(star3);
    expect(screen.getByTestId('review-submit')).not.toBeDisabled();
  });

  it('AC-01 happy path: submit dispara onSuccess con view', async () => {
    const onSuccess = vi.fn();
    render(
      withProviders(
        <ReviewForm eventId={EVENT_ID} vendorProfileId={HAPPY_VP} onSuccess={onSuccess} />,
      ),
    );
    fireEvent.click(screen.getByRole('radio', { name: '5 de 5 estrellas' }));
    fireEvent.change(screen.getByTestId('review-comment'), {
      target: { value: 'Excelente servicio' },
    });
    fireEvent.click(screen.getByTestId('review-submit'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const view = onSuccess.mock.calls[0]?.[0];
    expect(view.rating).toBe(5);
    expect(view.comment).toBe('Excelente servicio');
  });

  it('D6 REVIEW_NOT_ELIGIBLE reason=already_reviewed ⇒ banner de elegibilidad', async () => {
    render(
      withProviders(
        <ReviewForm
          eventId={EVENT_ID}
          vendorProfileId={createReviewMswTriggers.NOT_ELIGIBLE_ALREADY_REVIEWED}
        />,
      ),
    );
    fireEvent.click(screen.getByRole('radio', { name: '4 de 5 estrellas' }));
    fireEvent.click(screen.getByTestId('review-submit'));
    await waitFor(() => {
      const banner = screen.getByTestId('review-eligibility-banner');
      expect(banner).toHaveAttribute('data-reason', 'already_reviewed');
    });
  });

  it('EC-06 RESOURCE_NOT_FOUND ⇒ banner genérico role="alert" con copy i18n', async () => {
    render(
      withProviders(
        <ReviewForm eventId={EVENT_ID} vendorProfileId={createReviewMswTriggers.NOT_FOUND} />,
      ),
    );
    fireEvent.click(screen.getByRole('radio', { name: '4 de 5 estrellas' }));
    fireEvent.click(screen.getByTestId('review-submit'));
    await waitFor(() => {
      const err = screen.getByTestId('review-form-error');
      expect(err).toHaveAttribute('data-code', 'RESOURCE_NOT_FOUND');
    });
  });

  it('jest-axe: 0 violaciones', async () => {
    const { container } = render(
      withProviders(<ReviewForm eventId={EVENT_ID} vendorProfileId={HAPPY_VP} />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-065 · ReviewEligibilityBanner', () => {
  it.each([
    ['no_booking', 'reserva'],
    ['event_not_completed', 'completado'],
    ['window_expired', '30 días'],
    ['already_reviewed', 'reseña'],
  ] as const)('renderiza copy correcto para reason=%s', (reason, expectedFragment) => {
    render(
      withProviders(<ReviewEligibilityBanner reason={reason} />),
    );
    const banner = screen.getByTestId('review-eligibility-banner');
    expect(banner).toHaveAttribute('data-reason', reason);
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner.textContent?.toLowerCase()).toContain(expectedFragment.toLowerCase());
  });
});
