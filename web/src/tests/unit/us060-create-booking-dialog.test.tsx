// US-060 (PB-P1-036 / QA-004) — Unit tests DOM del `CreateBookingDialog`.
// Verifica:
//   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby`.
//   - Foco inicial en el checkbox del disclaimer.
//   - ESC cierra el modal.
//   - Checkbox del disclaimer con label asociado + aria-describedby → texto legal.
//   - CTA primaria `aria-disabled` cuando el disclaimer NO está aceptado; se habilita al marcar.
//   - Submit sin marcar disclaimer → no-op (no dispara `createFn`).
//   - Submit con disclaimer marcado ⇒ `createFn` recibe `{quoteId, disclaimerAccepted:true}`;
//     `onSuccess` y `onClose` se disparan.
//   - Error backend por código estable (`QUOTE_NOT_ACCEPTABLE`, `BOOKING_INTENT_ALREADY_EXISTS`,
//     `DISCLAIMER_REQUIRED`, `QUOTE_EXPIRED`) ⇒ banner accesible con `role="alert"` y mensaje i18n.
//   - Error desconocido ⇒ mensaje UNEXPECTED.
//   - jest-axe: 0 violaciones serias con o sin banner de error.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import esLatamOrganizer from '@/messages/es-LATAM/organizer.json';
import esLatamBooking from '@/messages/es-LATAM/booking.json';
import { CreateBookingDialog } from '@/features/booking/components/CreateBookingDialog';
import { ApiError } from '@/shared/api-client';

expect.extend(toHaveNoViolations);

// US-063 (FE-004): el shared `BookingDisclaimer` usa el namespace `booking.disclaimer.v1.*`.
// Debe cargarse junto al `organizer` para que el copy legal se renderice en los tests.
const messages = { organizer: esLatamOrganizer, booking: esLatamBooking };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

const QUOTE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CREATED_AT = '2026-07-17T15:00:00Z';

function baseView() {
  return {
    bookingIntentId: '99999999-8888-7777-6666-555555555555',
    quoteId: QUOTE_ID,
    status: 'pending' as const,
    createdAt: CREATED_AT,
  };
}

describe('US-060 · CreateBookingDialog', () => {
  it('AC-01 renderiza dialog accesible: role=dialog, aria-modal, labelledby, describedby', () => {
    const createFn = vi.fn(async () => baseView());
    render(withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={() => {}} createFn={createFn} />));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
    expect(screen.getByRole('heading', { name: 'Crear intención de booking' })).toBeInTheDocument();
  });

  it('AC-01 foco inicial en el checkbox del disclaimer', async () => {
    render(withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={() => {}} />));
    const cb = screen.getByLabelText('Entiendo y acepto estas condiciones.');
    await waitFor(() => expect(document.activeElement).toBe(cb));
  });

  it('AC-01 ESC dispara onClose', () => {
    const onClose = vi.fn();
    render(withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={onClose} />));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AC-02 checkbox disclaimer con label + aria-describedby → hint legal', () => {
    render(withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={() => {}} />));
    const cb = screen.getByLabelText('Entiendo y acepto estas condiciones.') as HTMLInputElement;
    expect(cb).toHaveAttribute('aria-describedby');
    const hintId = cb.getAttribute('aria-describedby');
    expect(hintId && document.getElementById(hintId)?.textContent).toMatch(/EventFlow/);
  });

  it('AC-02 CTA aria-disabled cuando disclaimer no aceptado; se habilita al marcar', () => {
    render(withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={() => {}} />));
    const submit = screen.getByRole('button', { name: 'Crear intención de booking' });
    expect(submit).toHaveAttribute('aria-disabled', 'true');
    const cb = screen.getByLabelText('Entiendo y acepto estas condiciones.');
    fireEvent.click(cb);
    expect(submit).toHaveAttribute('aria-disabled', 'false');
  });

  it('AC-02 submit sin disclaimer NO llama a createFn (defensa cliente)', async () => {
    const createFn = vi.fn(async () => baseView());
    render(
      withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={() => {}} createFn={createFn} />),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Crear intención de booking' }));
    });
    expect(createFn).not.toHaveBeenCalled();
  });

  it('AC-01 happy path: submit con disclaimer marcado ⇒ createFn recibe {quoteId, disclaimerAccepted:true}; onSuccess + onClose', async () => {
    const createFn = vi.fn(async () => baseView());
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(
      withIntl(
        <CreateBookingDialog
          quoteId={QUOTE_ID}
          onClose={onClose}
          onSuccess={onSuccess}
          createFn={createFn}
        />,
      ),
    );
    fireEvent.click(screen.getByLabelText('Entiendo y acepto estas condiciones.'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Crear intención de booking' }));
    });
    expect(createFn).toHaveBeenCalledWith({ quoteId: QUOTE_ID, disclaimerAccepted: true });
    expect(onSuccess).toHaveBeenCalledWith(baseView());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('resumen opcional (vendorName + amount + currency) se renderiza cuando se proveen', () => {
    render(
      withIntl(
        <CreateBookingDialog
          quoteId={QUOTE_ID}
          onClose={() => {}}
          vendorName="Vendor Demo SA"
          quoteAmount="5000.00"
          currencyCode="GTQ"
        />,
      ),
    );
    expect(screen.getByText('Vendor Demo SA')).toBeInTheDocument();
    expect(screen.getByText('5000.00 GTQ')).toBeInTheDocument();
  });

  it('QUOTE_NOT_ACCEPTABLE ⇒ banner role=alert con mensaje i18n', async () => {
    const createFn = vi.fn(async () => {
      throw new ApiError({
        code: 'QUOTE_NOT_ACCEPTABLE',
        message: 'ignored',
        status: 409,
        correlationId: 'corr',
      });
    });
    render(withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={() => {}} createFn={createFn} />));
    fireEvent.click(screen.getByLabelText('Entiendo y acepto estas condiciones.'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Crear intención de booking' }));
    });
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent('Esta cotización ya no puede aceptarse en su estado actual.');
  });

  it('BOOKING_INTENT_ALREADY_EXISTS ⇒ mensaje i18n específico', async () => {
    const createFn = vi.fn(async () => {
      throw new ApiError({
        code: 'BOOKING_INTENT_ALREADY_EXISTS',
        message: 'ignored',
        status: 409,
        correlationId: 'corr',
      });
    });
    render(withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={() => {}} createFn={createFn} />));
    fireEvent.click(screen.getByLabelText('Entiendo y acepto estas condiciones.'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Crear intención de booking' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ya existe un intento de booking activo para esta cotización.',
    );
  });

  it('QUOTE_EXPIRED ⇒ mensaje i18n específico', async () => {
    const createFn = vi.fn(async () => {
      throw new ApiError({ code: 'QUOTE_EXPIRED', message: 'ignored', status: 409, correlationId: 'c' });
    });
    render(withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={() => {}} createFn={createFn} />));
    fireEvent.click(screen.getByLabelText('Entiendo y acepto estas condiciones.'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Crear intención de booking' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Esta cotización venció y ya no puede aceptarse.');
  });

  it('DISCLAIMER_REQUIRED backend (defensa profunda) ⇒ mensaje i18n', async () => {
    const createFn = vi.fn(async () => {
      throw new ApiError({ code: 'DISCLAIMER_REQUIRED', message: 'ignored', status: 400, correlationId: 'c' });
    });
    render(withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={() => {}} createFn={createFn} />));
    fireEvent.click(screen.getByLabelText('Entiendo y acepto estas condiciones.'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Crear intención de booking' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Debes aceptar el aviso para continuar.');
  });

  it('error desconocido ⇒ mensaje UNEXPECTED', async () => {
    const createFn = vi.fn(async () => {
      throw new Error('boom');
    });
    render(withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={() => {}} createFn={createFn} />));
    fireEvent.click(screen.getByLabelText('Entiendo y acepto estas condiciones.'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Crear intención de booking' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un error inesperado. Intenta nuevamente.');
  });

  it('jest-axe: 0 violaciones serias (estado inicial, disclaimer sin marcar)', async () => {
    const { container } = render(withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={() => {}} />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('jest-axe: 0 violaciones serias (con banner de error visible)', async () => {
    const createFn = vi.fn(async () => {
      throw new ApiError({ code: 'QUOTE_NOT_FOUND', message: 'ignored', status: 404, correlationId: 'c' });
    });
    const { container } = render(
      withIntl(<CreateBookingDialog quoteId={QUOTE_ID} onClose={() => {}} createFn={createFn} />),
    );
    fireEvent.click(screen.getByLabelText('Entiendo y acepto estas condiciones.'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Crear intención de booking' }));
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
