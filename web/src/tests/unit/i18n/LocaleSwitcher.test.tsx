import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleSwitcher } from '@/shared/i18n/LocaleSwitcher';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const messages = { navigation: { localeSwitcher: { label: 'Language' } } };

function renderSwitcher(locale = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  refresh.mockClear();
  document.cookie = 'eventflow_locale=; path=/; max-age=0';
});

describe('<LocaleSwitcher>', () => {
  it('expone un combobox con aria-label resuelto vía t()', () => {
    renderSwitcher();
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument();
  });

  it('refleja el locale activo como valor seleccionado (equivalente a aria-current)', () => {
    renderSwitcher('pt');
    expect(screen.getByRole('combobox')).toHaveValue('pt');
  });

  it('renderiza las 4 opciones con etiqueta nativa', () => {
    renderSwitcher();
    expect(screen.getByRole('option', { name: 'Português' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
  });

  it('al seleccionar persiste la cookie y dispara router.refresh', async () => {
    const user = userEvent.setup();
    renderSwitcher('en');
    await user.selectOptions(screen.getByRole('combobox'), 'es-LATAM');
    expect(document.cookie).toContain('eventflow_locale=es-LATAM');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
