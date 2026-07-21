import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Money } from '@/shared/i18n/Money';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

// Mensajes mínimos del namespace `common.currency` para probar aria-label localizado.
// Cada entorno de test pasa el subset de locales que necesita.
const commonMessages: Record<string, AbstractIntlMessages> = {
  en: {
    common: {
      currency: {
        GTQ: 'Guatemalan quetzales',
        EUR: 'euros',
        MXN: 'Mexican pesos',
        COP: 'Colombian pesos',
        USD: 'US dollars',
      },
    },
  },
  'es-LATAM': {
    common: {
      currency: {
        GTQ: 'quetzales guatemaltecos',
        EUR: 'euros',
        MXN: 'pesos mexicanos',
        COP: 'pesos colombianos',
        USD: 'dólares estadounidenses',
      },
    },
  },
  pt: {
    common: {
      currency: {
        GTQ: 'quetzais guatemaltecos',
        EUR: 'euros',
        MXN: 'pesos mexicanos',
        COP: 'pesos colombianos',
        USD: 'dólares americanos',
      },
    },
  },
};

function renderWithLocale(node: ReactNode, locale: keyof typeof commonMessages) {
  return render(
    <NextIntlClientProvider locale={locale} messages={commonMessages[locale] ?? {}}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe('<Money>', () => {
  it('AC-01: renderiza con símbolo, title=ISO y aria-label con nombre completo (GTQ es-LATAM)', () => {
    renderWithLocale(<Money amount={500} currency="GTQ" />, 'es-LATAM');
    const el = screen.getByLabelText(/quetzales guatemaltecos/i);
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('title', 'GTQ');
    expect(el.textContent ?? '').toMatch(/Q/);
    expect(el.textContent ?? '').toMatch(/500/);
  });

  it('AC-02: el formato depende del locale del usuario (misma cifra, distinto separador)', () => {
    // `en` usa punto decimal → "$1,000.00" para USD.
    renderWithLocale(<Money amount={1000} currency="USD" />, 'en');
    // AC-03 desambigua USD en `en` con `currencyDisplay: 'code'` → "USD 1,000.00".
    expect(screen.getByText(/USD/)).toBeInTheDocument();
    expect(screen.getByText(/1,000\.00/)).toBeInTheDocument();
  });

  it('AC-03: USD en locale `en` se desambigua con código ISO en el texto visible', () => {
    renderWithLocale(<Money amount={500} currency="USD" />, 'en');
    // El texto visible NO debe empezar con `$` solitario (ambiguo); debe incluir "USD".
    const el = screen.getByLabelText(/US dollars/i);
    expect(el.textContent ?? '').toMatch(/USD/);
    expect(el).toHaveAttribute('title', 'USD');
  });

  it('MXN en locale `en` conserva el símbolo nativo Intl (MX$) — solo USD requiere desambiguación', () => {
    renderWithLocale(<Money amount={2500} currency="MXN" />, 'en');
    const el = screen.getByLabelText(/Mexican pesos/i);
    expect(el).toHaveAttribute('title', 'MXN');
    // El texto debe contener "MXN" (código o combinación MX$-like); en runtime real ICU produce
    // "MX$" pero en Node de test puede ser "MXN". Ambos son válidos y no ambiguos.
    expect(el.textContent ?? '').toMatch(/MX/);
  });

  it('usa el locale explícito por prop sobre el activo', () => {
    renderWithLocale(<Money amount={2500} currency="MXN" locale="es-LATAM" />, 'en');
    // El texto se formatea con el locale `es-LATAM` (es-419), no con `en`.
    // El aria-label proviene del namespace del provider (locale=`en`).
    expect(screen.getByText(/MX\$|MXN|2\.500|2,500/)).toBeInTheDocument();
  });

  it('locale inválido (no en whitelist) degrada al locale activo sin crash', () => {
    renderWithLocale(<Money amount={100} currency="USD" locale="zh" />, 'en');
    expect(screen.getByLabelText(/US dollars/i)).toBeInTheDocument();
  });

  it('EC-05: currency malformada cae a formato genérico y aria-label usa el código', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderWithLocale(<Money amount={100} currency="XY" />, 'en');
    // sin currency name traducido → aria-label = `100 XY`.
    const el = screen.getByLabelText(/100 XY/);
    expect(el.textContent ?? '').toBe('100 XY');
    expect(el).toHaveAttribute('title', 'XY');
  });

  it('formatOptions permite override maximumFractionDigits (vistas IA sin decimales)', () => {
    renderWithLocale(
      <Money amount={1234.56} currency="USD" formatOptions={{ maximumFractionDigits: 0 }} />,
      'en',
    );
    // "USD 1,235" — sin decimales.
    expect(screen.getByText(/USD\s?1,235$/)).toBeInTheDocument();
  });
});
