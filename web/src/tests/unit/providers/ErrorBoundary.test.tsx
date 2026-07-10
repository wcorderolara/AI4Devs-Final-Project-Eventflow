import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '@/shared/providers';

const messages = {
  errors: { envelope: { UNEXPECTED: 'Algo salió mal' } },
  common: { retry: 'Reintentar' },
};

function Boom(): React.JSX.Element {
  throw new Error('boom');
}

afterEach(() => vi.restoreAllMocks());

describe('<ErrorBoundary>', () => {
  it('renderiza el fallback con copy i18n (main role=alert, h1, botón retry)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary locale="es-LATAM" messages={messages}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Algo salió mal' })).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Reintentar' });
    expect(button).toHaveAttribute('type', 'button');
  });
});
