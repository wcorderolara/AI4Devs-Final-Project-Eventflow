import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { SkipLink } from '@/shared/navigation';

const messages = { navigation: { skipLink: 'Saltar al contenido principal' } };

describe('<SkipLink>', () => {
  it('enlaza a #main-content', () => {
    render(
      <NextIntlClientProvider locale="es-LATAM" messages={messages}>
        <SkipLink />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole('link', { name: 'Saltar al contenido principal' }),
    ).toHaveAttribute('href', '#main-content');
  });
});
