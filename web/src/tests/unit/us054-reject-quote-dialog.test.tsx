// US-054 (PB-P1-032 / QA-005) — Unit tests DOM del `RejectQuoteDialog`.
// Verifica:
//   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby`.
//   - Foco inicial en el botón "Cancelar" (patrón destructive-safe).
//   - ESC cierra el modal.
//   - Textarea con label asociado, contador live 0..500 y aria-describedby (hint + counter).
//   - Submit sin reason ⇒ mutation con `reason` omitido; con reason ⇒ propagada.
//   - Error del backend por código (`INVALID_REJECTION_REASON`, `QUOTE_NOT_REJECTABLE`, ...)
//     se pinta en el banner accesible con `role="alert"`.
//   - `onSuccess` se invoca con la vista y `onClose` tras éxito.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import esLatamQuotes from '@/messages/es-LATAM/quotes.json';
import { RejectQuoteDialog } from '@/features/quotes/components/RejectQuoteDialog';
import { ApiError } from '@/shared/api-client';

const messages = { quotes: esLatamQuotes };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

const QUOTE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function baseView() {
  return {
    id: QUOTE_ID,
    status: 'rejected' as const,
    rejectedAt: '2026-07-16T12:00:00Z',
    rejectionReason: null,
  };
}

describe('US-054 · RejectQuoteDialog', () => {
  it('AC-01 renderiza dialog accesible: role=dialog, aria-modal, labelledby, describedby', () => {
    const rejectFn = vi.fn(async () => baseView());
    render(withIntl(<RejectQuoteDialog quoteId={QUOTE_ID} onClose={() => {}} rejectFn={rejectFn} />));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
    // El title (heading) existe dentro del dialog — el CTA reusa el string, así que
    // desambiguamos por role para evitar el match múltiple.
    expect(screen.getByRole('heading', { name: 'Rechazar cotización' })).toBeInTheDocument();
  });

  it('AC-01 foco inicial en el botón Cancelar (destructive-safe)', async () => {
    const rejectFn = vi.fn();
    render(withIntl(<RejectQuoteDialog quoteId={QUOTE_ID} onClose={() => {}} rejectFn={rejectFn} />));
    const cancel = screen.getByRole('button', { name: 'Cancelar' });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
  });

  it('AC-01 ESC dispara onClose', () => {
    const onClose = vi.fn();
    render(withIntl(<RejectQuoteDialog quoteId={QUOTE_ID} onClose={onClose} />));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AC-01 textarea con label asociado, contador live y aria-describedby', () => {
    render(withIntl(<RejectQuoteDialog quoteId={QUOTE_ID} onClose={() => {}} />));
    const textarea = screen.getByLabelText('Motivo del rechazo (opcional)') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute('aria-describedby');
    // Contador inicial 0/500.
    expect(screen.getByText('0/500')).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: 'Precio alto' } });
    expect(screen.getByText('11/500')).toBeInTheDocument();
  });

  it('AC-03 submit sin reason ⇒ rejectFn recibe reason=""; onSuccess y onClose se disparan', async () => {
    const rejectFn = vi.fn(async () => baseView());
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(
      withIntl(
        <RejectQuoteDialog
          quoteId={QUOTE_ID}
          onClose={onClose}
          onSuccess={onSuccess}
          rejectFn={rejectFn}
        />,
      ),
    );
    const submit = screen.getByRole('button', { name: 'Rechazar cotización' });
    await act(async () => {
      fireEvent.click(submit);
    });
    expect(rejectFn).toHaveBeenCalledWith({ quoteId: QUOTE_ID, reason: '' });
    expect(onSuccess).toHaveBeenCalledWith(baseView());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AC-01 submit con reason ⇒ mutation propaga el texto', async () => {
    const rejectFn = vi.fn(async () => ({ ...baseView(), rejectionReason: 'Precio alto' }));
    render(
      withIntl(<RejectQuoteDialog quoteId={QUOTE_ID} onClose={() => {}} rejectFn={rejectFn} />),
    );
    const textarea = screen.getByLabelText('Motivo del rechazo (opcional)');
    fireEvent.change(textarea, { target: { value: 'Precio alto' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Rechazar cotización' }));
    });
    expect(rejectFn).toHaveBeenCalledWith({ quoteId: QUOTE_ID, reason: 'Precio alto' });
  });

  it('error del backend por código estable ⇒ banner role=alert con mensaje i18n', async () => {
    const rejectFn = vi.fn(async () => {
      throw new ApiError({
        code: 'QUOTE_NOT_REJECTABLE',
        message: 'ignored',
        status: 409,
        correlationId: 'corr',
      });
    });
    render(
      withIntl(<RejectQuoteDialog quoteId={QUOTE_ID} onClose={() => {}} rejectFn={rejectFn} />),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Rechazar cotización' }));
    });
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent(
      'Esta cotización ya no puede rechazarse en su estado actual.',
    );
  });

  it('error desconocido ⇒ mensaje UNEXPECTED', async () => {
    const rejectFn = vi.fn(async () => {
      throw new Error('boom');
    });
    render(
      withIntl(<RejectQuoteDialog quoteId={QUOTE_ID} onClose={() => {}} rejectFn={rejectFn} />),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Rechazar cotización' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado. Intenta nuevamente.',
    );
  });
});
