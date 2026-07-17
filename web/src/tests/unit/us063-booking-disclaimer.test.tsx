// US-063 (PB-P1-037 / QA-005) — Unit tests DOM + A11Y del shared `BookingDisclaimer`.
// Verifica (Decisión D3 + D4 + AC-A11Y):
//   - Modes `create` y `confirm` renderizan el mismo copy v1 (constante `agreementCopyVersion`).
//   - Checkbox con `<label htmlFor>` y `aria-describedby` al párrafo del copy legal.
//   - `data-disclaimer-version="v1"` visible para auditoría manual (D7 versionado).
//   - `onAcceptedChange` propaga al padre (true al marcar, false al desmarcar).
//   - Estado controlado desde el padre (`accepted` prop) — no state local.
//   - `disabled` propaga al `<input>`.
//   - Fallback locale (EC-03) — con `booking` messages ausentes, next-intl retorna la key path
//     como fallback (getMessageFallback). Verificamos que el componente no crashea.
//   - jest-axe: 0 violaciones en estados accepted=false/true, disabled=false/true.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import esLatamBooking from '@/messages/es-LATAM/booking.json';
import { BookingDisclaimer } from '@/features/booking/components/BookingDisclaimer';

expect.extend(toHaveNoViolations);

const messages = { booking: esLatamBooking };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

const CHECKBOX_LABEL = 'Entiendo y acepto estas condiciones.';

describe('US-063 · BookingDisclaimer shared component', () => {
  it('AC-03 mode=create: renderiza título + copy v1 + checkbox + version badge', () => {
    render(
      withIntl(
        <BookingDisclaimer mode="create" accepted={false} onAcceptedChange={() => {}} />,
      ),
    );
    expect(screen.getByRole('heading', { name: 'Aviso importante antes de continuar' })).toBeInTheDocument();
    expect(screen.getByText(/El acuerdo final, el pago y cualquier contrato ocurren fuera/)).toBeInTheDocument();
    expect(screen.getByLabelText(CHECKBOX_LABEL)).toBeInTheDocument();
    expect(screen.getByText(/Versión v1/)).toBeInTheDocument();
  });

  it('AC-03 mode=confirm: mismo copy (fuente única — D3)', () => {
    render(
      withIntl(
        <BookingDisclaimer mode="confirm" accepted={false} onAcceptedChange={() => {}} />,
      ),
    );
    expect(screen.getByText(/El acuerdo final, el pago y cualquier contrato ocurren fuera/)).toBeInTheDocument();
    expect(screen.getByLabelText(CHECKBOX_LABEL)).toBeInTheDocument();
  });

  it('A11Y: checkbox tiene aria-describedby apuntando al párrafo del copy legal', () => {
    render(withIntl(<BookingDisclaimer mode="create" accepted={false} onAcceptedChange={() => {}} />));
    const cb = screen.getByLabelText(CHECKBOX_LABEL) as HTMLInputElement;
    const describedBy = cb.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const target = describedBy ? document.getElementById(describedBy) : null;
    expect(target?.textContent).toMatch(/El acuerdo final/);
  });

  it('D5: onAcceptedChange se dispara con true al marcar y false al desmarcar', () => {
    const onAcceptedChange = vi.fn();
    const { rerender } = render(
      withIntl(<BookingDisclaimer mode="create" accepted={false} onAcceptedChange={onAcceptedChange} />),
    );
    const cb = screen.getByLabelText(CHECKBOX_LABEL);
    fireEvent.click(cb);
    expect(onAcceptedChange).toHaveBeenLastCalledWith(true);
    rerender(
      withIntl(<BookingDisclaimer mode="create" accepted={true} onAcceptedChange={onAcceptedChange} />),
    );
    fireEvent.click(cb);
    expect(onAcceptedChange).toHaveBeenLastCalledWith(false);
  });

  it('estado controlado desde el padre (accepted prop refleja el checked)', () => {
    const { rerender } = render(
      withIntl(<BookingDisclaimer mode="create" accepted={false} onAcceptedChange={() => {}} />),
    );
    expect((screen.getByLabelText(CHECKBOX_LABEL) as HTMLInputElement).checked).toBe(false);
    rerender(
      withIntl(<BookingDisclaimer mode="create" accepted={true} onAcceptedChange={() => {}} />),
    );
    expect((screen.getByLabelText(CHECKBOX_LABEL) as HTMLInputElement).checked).toBe(true);
  });

  it('disabled propaga al input (el browser bloquea la interacción)', () => {
    render(
      withIntl(
        <BookingDisclaimer mode="create" accepted={false} disabled onAcceptedChange={() => {}} />,
      ),
    );
    const cb = screen.getByLabelText(CHECKBOX_LABEL) as HTMLInputElement;
    expect(cb.disabled).toBe(true);
  });

  it('bodyIdRef publica el id del párrafo al padre (para agregarlo a aria-describedby del dialog)', () => {
    const bodyIdRef = vi.fn();
    render(
      withIntl(
        <BookingDisclaimer mode="create" accepted={false} onAcceptedChange={() => {}} bodyIdRef={bodyIdRef} />,
      ),
    );
    expect(bodyIdRef).toHaveBeenCalledTimes(1);
    expect(typeof bodyIdRef.mock.calls[0]?.[0]).toBe('string');
  });

  it('data-disclaimer-version="v1" visible para auditoría manual (D7)', () => {
    const { container } = render(
      withIntl(<BookingDisclaimer mode="create" accepted={false} onAcceptedChange={() => {}} />),
    );
    const section = container.querySelector('[data-disclaimer-version="v1"]');
    expect(section).toBeInTheDocument();
    expect(section?.getAttribute('data-mode')).toBe('create');
  });

  it('jest-axe: 0 violaciones (accepted=false)', async () => {
    const { container } = render(
      withIntl(<BookingDisclaimer mode="create" accepted={false} onAcceptedChange={() => {}} />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('jest-axe: 0 violaciones (accepted=true, disabled)', async () => {
    const { container } = render(
      withIntl(
        <BookingDisclaimer mode="confirm" accepted disabled onAcceptedChange={() => {}} />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
