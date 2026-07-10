import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Money } from '@/shared/i18n/Money';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function renderWithLocale(node: ReactNode, locale: string) {
  return render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe('<Money>', () => {
  it('formatea USD en locale en con símbolo $', () => {
    renderWithLocale(<Money amount={1000} currency="USD" />, 'en');
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
  });

  it('usa el locale explícito por prop sobre el activo', () => {
    renderWithLocale(<Money amount={2500} currency="MXN" locale="es-LATAM" />, 'en');
    // es-419 con MXN incluye el código o símbolo de la moneda.
    expect(screen.getByText(/MX\$|MXN/)).toBeInTheDocument();
  });

  it('con currency malformada cae a formato genérico sin crash (EC-05)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderWithLocale(<Money amount={100} currency="XY" />, 'en');
    expect(screen.getByText('100 XY')).toBeInTheDocument();
  });
});
