// US-053 (PB-P1-031 / QA-005 A11Y) — Unit tests DOM del `ValidUntilPicker`.
// Verifica:
//   - Label semántico asociado al input por `htmlFor`.
//   - Default `today + 15d`, `min = today + 1`, `max = today + 90` (todos en UTC).
//   - `aria-invalid` y `aria-describedby` correctamente enlazados cuando `errorMessage` está.
//   - Helper text con `min`/`max` interpolados via i18n.
//   - forwardRef entrega el elemento al padre (RHF).
import React, { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';
import {
  ValidUntilPicker,
  addDaysUtc,
} from '@/features/quotes/components/ValidUntilPicker';

const messages = { vendor: esLatamVendor };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

const FIXED_TODAY = new Date(Date.UTC(2026, 6, 16, 0, 0, 0));

describe('US-053 · ValidUntilPicker', () => {
  it('renderiza input type="date" con label asociado por htmlFor', () => {
    render(
      withIntl(
        <ValidUntilPicker label="Vigencia hasta" today={FIXED_TODAY} />,
      ),
    );
    const input = screen.getByLabelText('Vigencia hasta') as HTMLInputElement;
    expect(input.type).toBe('date');
  });

  it('aplica defaultValue = today + 15d, min = today + 1, max = today + 90 (UTC)', () => {
    render(
      withIntl(
        <ValidUntilPicker label="Vigencia hasta" today={FIXED_TODAY} />,
      ),
    );
    const input = screen.getByLabelText('Vigencia hasta') as HTMLInputElement;
    expect(input.min).toBe('2026-07-17'); // today+1
    expect(input.max).toBe('2026-10-14'); // today+90
    expect(input.defaultValue).toBe('2026-07-31'); // today+15
  });

  it('cuando errorMessage está definido: aria-invalid="true" + aria-describedby incluye el errorId', () => {
    render(
      withIntl(
        <ValidUntilPicker
          label="Vigencia hasta"
          errorMessage="Fecha inválida"
          today={FIXED_TODAY}
        />,
      ),
    );
    const input = screen.getByLabelText('Vigencia hasta');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Fecha inválida');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ').length).toBeGreaterThanOrEqual(2);
  });

  it('sin errorMessage: aria-invalid="false" y sin `role="alert"`', () => {
    render(
      withIntl(
        <ValidUntilPicker label="Vigencia hasta" today={FIXED_TODAY} />,
      ),
    );
    const input = screen.getByLabelText('Vigencia hasta');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('helper text i18n interpola {min} y {max}', () => {
    render(
      withIntl(
        <ValidUntilPicker label="Vigencia hasta" today={FIXED_TODAY} />,
      ),
    );
    expect(
      screen.getByText(/Elige una fecha entre 2026-07-17 y 2026-10-14\./i),
    ).toBeTruthy();
  });

  it('forwardRef entrega el elemento HTMLInputElement al padre', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      withIntl(
        <ValidUntilPicker label="Vigencia hasta" today={FIXED_TODAY} ref={ref} />,
      ),
    );
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('addDaysUtc suma calendario UTC de forma determinística', () => {
    expect(addDaysUtc(FIXED_TODAY, 0)).toBe('2026-07-16');
    expect(addDaysUtc(FIXED_TODAY, 1)).toBe('2026-07-17');
    expect(addDaysUtc(FIXED_TODAY, 15)).toBe('2026-07-31');
    expect(addDaysUtc(FIXED_TODAY, 90)).toBe('2026-10-14');
  });
});
