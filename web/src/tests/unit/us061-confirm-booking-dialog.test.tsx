// US-061 (PB-P1-036 / QA-004) — Unit tests DOM del `ConfirmBookingDialog`.
// Verifica:
//   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby`.
//   - Foco inicial en el botón "Cancelar" (patrón destructive-safe).
//   - ESC cierra el modal.
//   - Texto disclaimer FR-BOOKING-006 con aria-describedby y contenido "EventFlow no procesa pagos".
//   - Submit ⇒ `confirmFn` recibe `{bookingIntentId}`; `onSuccess` y `onClose` se disparan.
//   - Error backend por código estable (`BOOKING_INTENT_NOT_FOUND`, `BOOKING_INTENT_NOT_CONFIRMABLE`,
//     `FORBIDDEN`) ⇒ banner accesible con `role="alert"` y mensaje i18n.
//   - Error desconocido ⇒ mensaje UNEXPECTED.
//   - jest-axe: 0 violaciones serias con y sin banner de error.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';
import { ConfirmBookingDialog } from '@/features/booking/components/ConfirmBookingDialog';
import { ApiError } from '@/shared/api-client';

expect.extend(toHaveNoViolations);

const messages = { vendor: esLatamVendor };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

const INTENT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CONFIRMED_AT = '2026-07-17T18:00:00Z';

function baseView() {
  return {
    bookingIntentId: INTENT_ID,
    status: 'confirmed_intent' as const,
    confirmedAt: CONFIRMED_AT,
  };
}

describe('US-061 · ConfirmBookingDialog', () => {
  it('AC-01 renderiza dialog accesible: role=dialog, aria-modal, labelledby, describedby', () => {
    const confirmFn = vi.fn(async () => baseView());
    render(withIntl(<ConfirmBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} confirmFn={confirmFn} />));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
    expect(screen.getByRole('heading', { name: 'Confirmar intención de booking' })).toBeInTheDocument();
  });

  it('foco inicial en el botón Cancelar (destructive-safe)', async () => {
    render(withIntl(<ConfirmBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} />));
    const cancel = screen.getByRole('button', { name: 'Cancelar' });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
  });

  it('ESC dispara onClose', () => {
    const onClose = vi.fn();
    render(withIntl(<ConfirmBookingDialog bookingIntentId={INTENT_ID} onClose={onClose} />));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('texto disclaimer FR-BOOKING-006 presente con contenido no-pagos', () => {
    render(withIntl(<ConfirmBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} />));
    const dialog = screen.getByRole('dialog');
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    // El disclaimer está enlazado en aria-describedby y menciona "EventFlow no procesa pagos".
    expect(dialog.textContent).toMatch(/EventFlow no procesa pagos/);
  });

  it('AC-01 happy path: submit ⇒ confirmFn recibe {bookingIntentId}; onSuccess + onClose', async () => {
    const confirmFn = vi.fn(async () => baseView());
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(
      withIntl(
        <ConfirmBookingDialog
          bookingIntentId={INTENT_ID}
          onClose={onClose}
          onSuccess={onSuccess}
          confirmFn={confirmFn}
        />,
      ),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar booking' }));
    });
    expect(confirmFn).toHaveBeenCalledWith({ bookingIntentId: INTENT_ID });
    expect(onSuccess).toHaveBeenCalledWith(baseView());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('resumen opcional (event + amount + currency) se renderiza cuando se proveen', () => {
    render(
      withIntl(
        <ConfirmBookingDialog
          bookingIntentId={INTENT_ID}
          onClose={() => {}}
          eventTitle="Boda García"
          quoteAmount="5500.00"
          currencyCode="GTQ"
        />,
      ),
    );
    expect(screen.getByText('Boda García')).toBeInTheDocument();
    expect(screen.getByText('5500.00 GTQ')).toBeInTheDocument();
  });

  it('BOOKING_INTENT_NOT_CONFIRMABLE ⇒ banner role=alert con mensaje i18n', async () => {
    const confirmFn = vi.fn(async () => {
      throw new ApiError({
        code: 'BOOKING_INTENT_NOT_CONFIRMABLE',
        message: 'ignored',
        status: 409,
        correlationId: 'corr',
      });
    });
    render(withIntl(<ConfirmBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} confirmFn={confirmFn} />));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar booking' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Este booking ya no puede confirmarse en su estado actual.',
    );
  });

  it('BOOKING_INTENT_NOT_FOUND ⇒ mensaje i18n específico', async () => {
    const confirmFn = vi.fn(async () => {
      throw new ApiError({ code: 'BOOKING_INTENT_NOT_FOUND', message: 'ignored', status: 404, correlationId: 'c' });
    });
    render(withIntl(<ConfirmBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} confirmFn={confirmFn} />));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar booking' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No encontramos este booking o ya no está disponible.',
    );
  });

  it('FORBIDDEN ⇒ mensaje i18n vendor-only', async () => {
    const confirmFn = vi.fn(async () => {
      throw new ApiError({ code: 'FORBIDDEN', message: 'ignored', status: 403, correlationId: 'c' });
    });
    render(withIntl(<ConfirmBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} confirmFn={confirmFn} />));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar booking' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Solo el proveedor asignado puede confirmar este booking.',
    );
  });

  it('error desconocido ⇒ mensaje UNEXPECTED', async () => {
    const confirmFn = vi.fn(async () => {
      throw new Error('boom');
    });
    render(withIntl(<ConfirmBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} confirmFn={confirmFn} />));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar booking' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un error inesperado. Intenta nuevamente.');
  });

  it('jest-axe: 0 violaciones serias (estado inicial)', async () => {
    const { container } = render(withIntl(<ConfirmBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('jest-axe: 0 violaciones serias (con banner de error visible)', async () => {
    const confirmFn = vi.fn(async () => {
      throw new ApiError({ code: 'BOOKING_INTENT_NOT_FOUND', message: 'ignored', status: 404, correlationId: 'c' });
    });
    const { container } = render(
      withIntl(<ConfirmBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} confirmFn={confirmFn} />),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar booking' }));
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
