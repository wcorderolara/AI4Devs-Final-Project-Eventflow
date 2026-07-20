// US-065 (PB-P1-038 / QA-004) — Unit tests DOM del `StarRating` accesible.
// Verifica WAI-ARIA APG (Radio Group):
//   - `role="radiogroup"` + `aria-labelledby`.
//   - 5 buttons con `role="radio"` + `aria-checked` + `aria-label` localizado.
//   - Roving tabIndex: sin selección → primer botón tabIndex=0; con selección → sólo el seleccionado.
//   - Navegación teclado: ArrowRight/Up incrementa (wrap 5→1), ArrowLeft/Down decrementa (wrap 1→5),
//     Home=1, End=5, Space/Enter selecciona el enfocado.
//   - `onChange` dispara con el valor 1..5 correcto.
//   - `disabled=true` desactiva interacción (todos los buttons con disabled).
//   - jest-axe: 0 violaciones serias.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import esLatamOrganizer from '@/messages/es-LATAM/organizer.json';
import { StarRating } from '@/features/reviews/components/StarRating';

expect.extend(toHaveNoViolations);

const messages = { organizer: esLatamOrganizer };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

function renderStarRating(opts: {
  value?: number | null;
  onChange?: (v: number) => void;
  disabled?: boolean;
} = {}) {
  const onChange = opts.onChange ?? vi.fn();
  const utils = render(
    withIntl(
      <>
        <span id="rating-label">Puntuación</span>
        <StarRating
          labelId="rating-label"
          value={opts.value ?? null}
          onChange={onChange}
          disabled={opts.disabled ?? false}
        />
      </>,
    ),
  );
  return { ...utils, onChange };
}

describe('US-065 · StarRating (A11Y + interacción)', () => {
  it('renderiza radiogroup accesible con aria-labelledby', () => {
    renderStarRating();
    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-labelledby', 'rating-label');
  });

  it('renderiza 5 radios con aria-label localizado', () => {
    renderStarRating();
    for (let i = 1; i <= 5; i += 1) {
      const radio = screen.getByRole('radio', { name: `${i} de 5 estrellas` });
      expect(radio).toBeInTheDocument();
    }
  });

  it('sin selección: primer radio tabIndex=0; resto tabIndex=-1', () => {
    renderStarRating();
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveAttribute('tabindex', '0');
    for (let i = 1; i < 5; i += 1) {
      expect(radios[i]).toHaveAttribute('tabindex', '-1');
    }
  });

  it('con value=3: sólo el radio seleccionado tiene tabIndex=0 y aria-checked=true', () => {
    renderStarRating({ value: 3 });
    const radios = screen.getAllByRole('radio');
    expect(radios[2]).toHaveAttribute('tabindex', '0');
    expect(radios[2]).toHaveAttribute('aria-checked', 'true');
    expect(radios[0]).toHaveAttribute('aria-checked', 'false');
    expect(radios[4]).toHaveAttribute('aria-checked', 'false');
  });

  it('click en la 4ta estrella dispara onChange(4)', () => {
    const { onChange } = renderStarRating();
    const fourth = screen.getByRole('radio', { name: '4 de 5 estrellas' });
    fireEvent.click(fourth);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('ArrowRight desde 3 dispara onChange(4)', () => {
    const { onChange } = renderStarRating({ value: 3 });
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('ArrowRight desde 5 hace wrap a 1', () => {
    const { onChange } = renderStarRating({ value: 5 });
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('ArrowLeft desde 1 hace wrap a 5', () => {
    const { onChange } = renderStarRating({ value: 1 });
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('Home dispara onChange(1); End dispara onChange(5)', () => {
    const { onChange } = renderStarRating({ value: 3 });
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(group, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it('Space/Enter selecciona el enfocado sin selección previa', () => {
    const { onChange } = renderStarRating();
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: ' ' });
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(group, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('disabled=true impide interacción (buttons deshabilitados)', () => {
    const { onChange } = renderStarRating({ disabled: true });
    const radios = screen.getAllByRole('radio');
    for (const r of radios) {
      expect(r).toBeDisabled();
    }
    fireEvent.click(radios[3]!);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('jest-axe: 0 violaciones (sin selección)', async () => {
    const { container } = renderStarRating();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('jest-axe: 0 violaciones (con selección=4)', async () => {
    const { container } = renderStarRating({ value: 4 });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
