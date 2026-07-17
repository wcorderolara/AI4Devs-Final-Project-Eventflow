// US-061 (PB-P1-036 / QA-004; refactor US-063 / PB-P1-037 / QA-005) — Unit tests DOM del
// `ConfirmBookingDialog`. Verifica:
//   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby`.
//   - Foco inicial en el botón "Cancelar" (patrón destructive-safe).
//   - ESC cierra el modal.
//   - US-063 (D1 + D4): `BookingDisclaimer mode='confirm'` shared component con checkbox
//     obligatorio, aria-describedby al copy legal v1, CTA `aria-disabled` hasta marcar.
//   - Submit ⇒ `confirmFn` recibe `{bookingIntentId, disclaimerAccepted:true}`; `onSuccess` y
//     `onClose` se disparan.
//   - Error backend por código estable (`DISCLAIMER_REQUIRED`, `BOOKING_INTENT_NOT_FOUND`,
//     `BOOKING_INTENT_NOT_CONFIRMABLE`, `FORBIDDEN`) ⇒ banner accesible con `role="alert"` y
//     mensaje i18n.
//   - Error desconocido ⇒ mensaje UNEXPECTED.
//   - jest-axe: 0 violaciones serias con y sin banner de error.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';
import esLatamBooking from '@/messages/es-LATAM/booking.json';
import { ConfirmBookingDialog } from '@/features/booking/components/ConfirmBookingDialog';
import { ApiError } from '@/shared/api-client';

expect.extend(toHaveNoViolations);

const messages = { vendor: esLatamVendor, booking: esLatamBooking };
const DISCLAIMER_CHECKBOX_LABEL = 'Entiendo y acepto estas condiciones.';

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

  it('US-063 D4: shared BookingDisclaimer con checkbox + copy v1 enlazado a describedby', () => {
    render(withIntl(<ConfirmBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} />));
    const dialog = screen.getByRole('dialog');
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    // El copy v1 del disclaimer está renderizado dentro del dialog.
    expect(dialog.textContent).toMatch(/El acuerdo final, el pago y cualquier contrato ocurren fuera/);
    const cb = screen.getByLabelText(DISCLAIMER_CHECKBOX_LABEL);
    expect(cb).toHaveAttribute('aria-describedby');
  });

  it('US-063 D1: CTA aria-disabled sin marcar disclaimer; submit no dispara confirmFn', async () => {
    const confirmFn = vi.fn(async () => baseView());
    render(withIntl(<ConfirmBookingDialog bookingIntentId={INTENT_ID} onClose={() => {}} confirmFn={confirmFn} />));
    const submit = screen.getByRole('button', { name: 'Confirmar booking' });
    expect(submit).toHaveAttribute('aria-disabled', 'true');
    await act(async () => {
      fireEvent.click(submit);
    });
    expect(confirmFn).not.toHaveBeenCalled();
  });

  it('AC-01 happy path: marca disclaimer + submit ⇒ confirmFn recibe {bookingIntentId, disclaimerAccepted:true}; onSuccess + onClose', async () => {
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
    fireEvent.click(screen.getByLabelText(DISCLAIMER_CHECKBOX_LABEL));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar booking' }));
    });
    expect(confirmFn).toHaveBeenCalledWith({ bookingIntentId: INTENT_ID, disclaimerAccepted: true });
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
    fireEvent.click(screen.getByLabelText(DISCLAIMER_CHECKBOX_LABEL));
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
    fireEvent.click(screen.getByLabelText(DISCLAIMER_CHECKBOX_LABEL));
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
    fireEvent.click(screen.getByLabelText(DISCLAIMER_CHECKBOX_LABEL));
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
    fireEvent.click(screen.getByLabelText(DISCLAIMER_CHECKBOX_LABEL));
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
    fireEvent.click(screen.getByLabelText(DISCLAIMER_CHECKBOX_LABEL));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar booking' }));
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
