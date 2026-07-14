/// <reference types="@testing-library/jest-dom" />
// US-033 (PB-P1-019 / QA-004) — Unit tests del componente `ProgressBar` (FE-001).
// Cubre A11Y-01..03 (ARIA canónicos), UT-08-FE (render sin transformación aritmética) y
// AC-04 (formateo `Intl.NumberFormat({style:'percent'})` por locale).
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ProgressBar } from '@/features/tasks/progress/components/ProgressBar';

const messages = {
  checklist: {
    progress: {
      label: 'Progreso del checklist',
      tooltip: '{done} de {total} tareas hechas. {skipped} omitidas.',
      skipped_note: '{count, plural, one {# tarea omitida} other {# tareas omitidas}}',
    },
  },
};

function renderWithLocale(locale: 'es-LATAM' | 'es-ES' | 'pt' | 'en', percentage: number) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages as never}>
      <ProgressBar
        percentage={percentage}
        done={percentage === 100 ? 10 : Math.round(percentage / 10)}
        totalCountable={10}
        skipped={2}
      />
    </NextIntlClientProvider>,
  );
}

describe('US-033 ProgressBar (FE-001 / QA-004)', () => {
  it('A11Y-01: expone `role="progressbar"` con `aria-valuenow/min/max`', () => {
    renderWithLocale('es-LATAM', 75);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '75');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('A11Y-02: `aria-busy="true"` durante loading; sin `aria-valuenow` numérico', () => {
    render(
      <NextIntlClientProvider locale="es-LATAM" messages={messages as never}>
        <ProgressBar
          percentage={0}
          done={0}
          totalCountable={0}
          skipped={0}
          loading
        />
      </NextIntlClientProvider>,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-busy', 'true');
    expect(bar).not.toHaveAttribute('aria-valuenow');
  });

  it('A11Y-03: `aria-label` localizado (es-LATAM)', () => {
    renderWithLocale('es-LATAM', 50);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label', 'Progreso del checklist');
  });

  it('UT-08-FE / VR-04: renderiza el `percentage` recibido sin transformación aritmética', () => {
    renderWithLocale('es-LATAM', 33);
    // El valor mostrado es exactamente `33` (formateado como porcentaje del locale, no recalculado).
    // No re-derivamos `Math.round(done/total*100)` en el componente.
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('33');
  });

  it('AC-04: formateo `style:percent` en `en` renderiza sin espacio (`75%`)', () => {
    renderWithLocale('en', 75);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('AC-04: formateo `style:percent` en `es-LATAM` renderiza con espacio no-breakable (`75 %`)', () => {
    renderWithLocale('es-LATAM', 75);
    // CLDR es-419 usa NBSP (` `) entre número y símbolo. Regex evita depender del carácter.
    expect(screen.getByText(/75\s?%/)).toBeInTheDocument();
  });

  it('AC-04: renderizado en `pt` correcto', () => {
    renderWithLocale('pt', 40);
    expect(screen.getByText(/40\s?%/)).toBeInTheDocument();
  });

  it('AC-04: renderizado en `es-ES` correcto', () => {
    renderWithLocale('es-ES', 25);
    expect(screen.getByText(/25\s?%/)).toBeInTheDocument();
  });

  it('renderiza nota de omitidas cuando `skipped > 0`', () => {
    renderWithLocale('es-LATAM', 50);
    expect(screen.getByText(/2 tareas omitidas/)).toBeInTheDocument();
  });

  it('renderiza `0%` cuando `total_countable = 0` (EC-01/02/03)', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages as never}>
        <ProgressBar percentage={0} done={0} totalCountable={0} skipped={0} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
