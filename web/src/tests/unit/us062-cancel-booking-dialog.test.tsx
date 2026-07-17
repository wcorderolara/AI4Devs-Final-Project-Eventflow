// US-062 (PB-P1-036 / QA-004) — Unit tests DOM del `CancelBookingDialog`.
// Verifica:
//   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby`.
//   - Foco inicial en "Volver" (destructive-safe).
//   - ESC cierra.
//   - Textarea con label asociado, contador live 0..500 y aria-describedby.
//   - AC-03: submit sin reason ⇒ `cancelFn` recibe `reason=''` (el UC persistirá null).
//   - Submit con reason ⇒ propagado.
//   - Error backend por código estable (`BOOKING_INTENT_NOT_CANCELLABLE`,
//     `INVALID_CANCELLATION_REASON`, `BOOKING_INTENT_NOT_FOUND`, `FORBIDDEN`) ⇒ banner accesible.
//   - jest-axe: 0 violaciones (con y sin banner).
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import esLatamBooking from '@/messages/es-LATAM/booking.json';
import { CancelBookingDialog } from '@/features/booking/components/CancelBookingDialog';
import { ApiError } from '@/shared/api-client';

expect.extend(toHaveNoViolations);

const messages = { booking: esLatamBooking };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

const INTENT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CANCELLED_AT = '2026-07-17T19:00:00Z';

function baseView() {
  return {
    bookingIntentId: INTENT_ID,
    status: 'cancelled' as const,
    cancelledAt: CANCELLED_AT,
    cancelledBy: '88888888-8888-4888-8888-888888888888',
    cancellationReason: null,
  };
}

describe('US-062 · CancelBookingDialog', () => {
  it('renderiza dialog accesible: role=dialog, aria-modal, labelledby, describedby', () => {
    const cancelFn = vi.fn(async () => baseView());
    render(withIntl(<CancelBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} cancelFn={cancelFn} />));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
    expect(screen.getByRole('heading', { name: 'Cancelar intención de booking' })).toBeInTheDocument();
  });

  it('foco inicial en el botón Volver (destructive-safe)', async () => {
    render(withIntl(<CancelBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} />));
    const back = screen.getByRole('button', { name: 'Volver' });
    await waitFor(() => expect(document.activeElement).toBe(back));
  });

  it('ESC dispara onClose', () => {
    const onClose = vi.fn();
    render(withIntl(<CancelBookingDialog bookingIntentId={INTENT_ID} onClose={onClose} />));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('textarea con label asociado, contador live 0..500 y aria-describedby', () => {
    render(withIntl(<CancelBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} />));
    const textarea = screen.getByLabelText('Motivo de la cancelación (opcional)') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute('aria-describedby');
    expect(screen.getByText('0/500')).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: 'Cambio de planes' } });
    expect(screen.getByText('16/500')).toBeInTheDocument();
  });

  it('AC-03 submit sin reason ⇒ cancelFn recibe reason=""; onSuccess + onClose', async () => {
    const cancelFn = vi.fn(async () => baseView());
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(
      withIntl(
        <CancelBookingDialog
          bookingIntentId={INTENT_ID}
          onClose={onClose}
          onSuccess={onSuccess}
          cancelFn={cancelFn}
        />,
      ),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    });
    expect(cancelFn).toHaveBeenCalledWith({ bookingIntentId: INTENT_ID, reason: '' });
    expect(onSuccess).toHaveBeenCalledWith(baseView());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submit con reason ⇒ mutation propaga el texto', async () => {
    const cancelFn = vi.fn(async () => ({ ...baseView(), cancellationReason: 'Cambio de planes' }));
    render(
      withIntl(<CancelBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} cancelFn={cancelFn} />),
    );
    const textarea = screen.getByLabelText('Motivo de la cancelación (opcional)');
    fireEvent.change(textarea, { target: { value: 'Cambio de planes' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    });
    expect(cancelFn).toHaveBeenCalledWith({ bookingIntentId: INTENT_ID, reason: 'Cambio de planes' });
  });

  it('BOOKING_INTENT_NOT_CANCELLABLE ⇒ banner role=alert', async () => {
    const cancelFn = vi.fn(async () => {
      throw new ApiError({
        code: 'BOOKING_INTENT_NOT_CANCELLABLE',
        message: 'ignored',
        status: 409,
        correlationId: 'corr',
      });
    });
    render(withIntl(<CancelBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} cancelFn={cancelFn} />));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Este booking ya no puede cancelarse en su estado actual.',
    );
  });

  it('INVALID_CANCELLATION_REASON ⇒ banner con mensaje i18n', async () => {
    const cancelFn = vi.fn(async () => {
      throw new ApiError({ code: 'INVALID_CANCELLATION_REASON', message: 'ignored', status: 400, correlationId: 'c' });
    });
    render(withIntl(<CancelBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} cancelFn={cancelFn} />));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('El motivo no puede superar 500 caracteres.');
  });

  it('BOOKING_INTENT_NOT_FOUND ⇒ mensaje i18n específico', async () => {
    const cancelFn = vi.fn(async () => {
      throw new ApiError({ code: 'BOOKING_INTENT_NOT_FOUND', message: 'ignored', status: 404, correlationId: 'c' });
    });
    render(withIntl(<CancelBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} cancelFn={cancelFn} />));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('No encontramos este booking o ya no está disponible.');
  });

  it('error desconocido ⇒ mensaje UNEXPECTED', async () => {
    const cancelFn = vi.fn(async () => {
      throw new Error('boom');
    });
    render(withIntl(<CancelBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} cancelFn={cancelFn} />));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un error inesperado. Intenta nuevamente.');
  });

  it('jest-axe: 0 violaciones (estado inicial)', async () => {
    const { container } = render(withIntl(<CancelBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('jest-axe: 0 violaciones (con banner de error visible)', async () => {
    const cancelFn = vi.fn(async () => {
      throw new ApiError({ code: 'FORBIDDEN', message: 'ignored', status: 403, correlationId: 'c' });
    });
    const { container } = render(
      withIntl(<CancelBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} cancelFn={cancelFn} />),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
