import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import NotFound from '@/app/not-found';

const messages = {
  errors: {
    notFound: { title: 'Página no encontrada', body: 'No existe.', cta: 'Volver al inicio' },
  },
};

describe('not-found.tsx', () => {
  it('renderiza copy i18n con landmark main, h1 único y CTA a /', () => {
    render(
      <NextIntlClientProvider locale="es-LATAM" messages={messages}>
        <NotFound />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });
});
