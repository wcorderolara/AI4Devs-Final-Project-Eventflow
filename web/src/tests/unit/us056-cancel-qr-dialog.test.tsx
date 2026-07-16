// US-056 (PB-P1-034 / QA-005) — Unit tests DOM + a11y del `CancelQRDialog`.
// Verifica:
//   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby`.
//   - Foco inicial en el botón "Volver" (patrón destructive-safe).
//   - ESC cierra el modal.
//   - Textarea con label asociado, contador live 0..500 y aria-describedby (hint + counter).
//   - Submit sin reason ⇒ mutation con `reason` omitido; con reason ⇒ propagada.
//   - Error del backend por código estable (`QR_HAS_CONFIRMED_BOOKING`, `QR_NOT_CANCELLABLE`,
//     `INVALID_CANCELLATION_REASON`, ...) se pinta en el banner accesible (`role="alert"`)
//     con el mensaje i18n correspondiente.
//   - `onSuccess` se invoca con la vista y `onClose` tras éxito.
//   - jest-axe: 0 violaciones serias del componente renderizado.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import esLatamOrganizer from '@/messages/es-LATAM/organizer.json';
import { CancelQRDialog } from '@/features/quotes/components/CancelQRDialog';
import { ApiError } from '@/shared/api-client';

expect.extend(toHaveNoViolations);

const messages = { organizer: esLatamOrganizer };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

const QR_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function baseView() {
  return {
    id: QR_ID,
    status: 'cancelled' as const,
    cancelledAt: '2026-07-16T12:00:00Z',
    cancelledBy: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    cancellationReason: null,
  };
}

describe('US-056 · CancelQRDialog', () => {
  it('AC-01 renderiza dialog accesible: role=dialog, aria-modal, labelledby, describedby', () => {
    const cancelFn = vi.fn(async () => baseView());
    render(
      withIntl(<CancelQRDialog quoteRequestId={QR_ID} onClose={() => {}} cancelFn={cancelFn} />),
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
    expect(
      screen.getByRole('heading', { name: 'Cancelar solicitud de cotización' }),
    ).toBeInTheDocument();
  });

  it('AC-01 foco inicial en el botón Volver (destructive-safe)', async () => {
    render(withIntl(<CancelQRDialog quoteRequestId={QR_ID} onClose={() => {}} />));
    const back = screen.getByRole('button', { name: 'Volver' });
    await waitFor(() => expect(document.activeElement).toBe(back));
  });

  it('AC-01 ESC dispara onClose', () => {
    const onClose = vi.fn();
    render(withIntl(<CancelQRDialog quoteRequestId={QR_ID} onClose={onClose} />));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AC-01 textarea con label asociado, contador live y aria-describedby', () => {
    render(withIntl(<CancelQRDialog quoteRequestId={QR_ID} onClose={() => {}} />));
    const textarea = screen.getByLabelText(
      'Motivo de la cancelación (opcional)',
    ) as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute('aria-describedby');
    expect(screen.getByText('0/500')).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: 'Cambio de planes' } });
    expect(screen.getByText('16/500')).toBeInTheDocument();
  });

  it('AC-02 submit sin reason ⇒ cancelFn recibe reason=""; onSuccess/onClose disparan', async () => {
    const cancelFn = vi.fn(async () => baseView());
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(
      withIntl(
        <CancelQRDialog
          quoteRequestId={QR_ID}
          onClose={onClose}
          onSuccess={onSuccess}
          cancelFn={cancelFn}
        />,
      ),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    });
    expect(cancelFn).toHaveBeenCalledWith({ quoteRequestId: QR_ID, reason: '' });
    expect(onSuccess).toHaveBeenCalledWith(baseView());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AC-01 submit con reason ⇒ mutation propaga el texto', async () => {
    const cancelFn = vi.fn(async () => ({ ...baseView(), cancellationReason: 'Cambio' }));
    render(
      withIntl(<CancelQRDialog quoteRequestId={QR_ID} onClose={() => {}} cancelFn={cancelFn} />),
    );
    const textarea = screen.getByLabelText('Motivo de la cancelación (opcional)');
    fireEvent.change(textarea, { target: { value: 'Cambio' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    });
    expect(cancelFn).toHaveBeenCalledWith({ quoteRequestId: QR_ID, reason: 'Cambio' });
  });

  it('EC-01 error QR_HAS_CONFIRMED_BOOKING ⇒ banner role=alert con mensaje i18n', async () => {
    const cancelFn = vi.fn(async () => {
      throw new ApiError({
        code: 'QR_HAS_CONFIRMED_BOOKING',
        message: 'ignored',
        status: 409,
        correlationId: 'corr',
      });
    });
    render(
      withIntl(<CancelQRDialog quoteRequestId={QR_ID} onClose={() => {}} cancelFn={cancelFn} />),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No es posible cancelar: existe un intento de reserva confirmado asociado. Cancela primero la reserva.',
    );
  });

  it('EC-04 error INVALID_CANCELLATION_REASON ⇒ banner con mensaje i18n', async () => {
    const cancelFn = vi.fn(async () => {
      throw new ApiError({
        code: 'INVALID_CANCELLATION_REASON',
        message: 'ignored',
        status: 400,
        correlationId: 'corr',
      });
    });
    render(
      withIntl(<CancelQRDialog quoteRequestId={QR_ID} onClose={() => {}} cancelFn={cancelFn} />),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'El motivo no puede superar 500 caracteres.',
    );
  });

  it('error desconocido ⇒ mensaje UNEXPECTED', async () => {
    const cancelFn = vi.fn(async () => {
      throw new Error('boom');
    });
    render(
      withIntl(<CancelQRDialog quoteRequestId={QR_ID} onClose={() => {}} cancelFn={cancelFn} />),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado. Intenta nuevamente.',
    );
  });

  it('QA-005 axe: 0 violaciones serias en el render inicial', async () => {
    const { container } = render(
      withIntl(<CancelQRDialog quoteRequestId={QR_ID} onClose={() => {}} />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
