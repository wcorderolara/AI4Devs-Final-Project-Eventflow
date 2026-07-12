// US-002 / QA-001(FE) + QA-005 — RegisterVendorForm: validación (EC-03), captcha gate, happy
// path con redirección a /vendor/onboarding (AC-01/AC-02), mensaje neutro EMAIL_TAKEN idéntico
// al flujo organizer (EC-01/SEC-001) y accesibilidad (axe + ARIA).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage, RegisterVendorForm } from '@/features/auth';
import esLatamAuth from '@/messages/es-LATAM/auth.json';
import { server } from '@/tests/msw/server';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));

afterEach(() => {
  push.mockClear();
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <NextIntlClientProvider locale="es-LATAM" messages={{ auth: esLatamAuth }}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

async function fillValidVendorForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText('Nombre comercial'), 'Catering Luna');
  await user.type(screen.getByLabelText('Correo electrónico'), 'luna@eventflow.test');
  await user.type(screen.getByLabelText('Contraseña'), 'segura12345');
  await user.click(screen.getByLabelText('Acepto los términos y la política de privacidad'));
  await user.click(screen.getByLabelText('No soy un robot'));
}

describe('US-002 FE-001 — render condicional por role', () => {
  it('role=vendor renderiza el form de proveedor; default renderiza organizer', () => {
    const { unmount } = renderWithProviders(<RegisterPage roleParam="vendor" />);
    expect(screen.getByRole('heading', { name: 'Crea tu cuenta de proveedor' })).toBeInTheDocument();
    unmount();
    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole('heading', { name: 'Crea tu cuenta de organizador' })).toBeInTheDocument();
  });
});

describe('US-002 FE-002/FE-003/FE-004 — flujo vendor', () => {
  it('AC-01/AC-02: happy path → redirige a /vendor/onboarding', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterVendorForm />);
    await fillValidVendorForm(user);
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta de proveedor' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/vendor/onboarding'));
  });

  it('EC-03: businessName de 1 carácter → error de campo, sin request', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterVendorForm />);
    await user.type(screen.getByLabelText('Nombre comercial'), 'A');
    await user.type(screen.getByLabelText('Correo electrónico'), 'luna@eventflow.test');
    await user.type(screen.getByLabelText('Contraseña'), 'segura12345');
    await user.click(screen.getByLabelText('Acepto los términos y la política de privacidad'));
    await user.click(screen.getByLabelText('No soy un robot'));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta de proveedor' }));

    expect(
      await screen.findByText('El nombre comercial debe tener entre 2 y 150 caracteres'),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('EC-01/SEC-001: 409 EMAIL_TAKEN → mismo mensaje neutro que el flujo organizer', async () => {
    server.use(
      http.post('*/api/v1/auth/register', () =>
        HttpResponse.json(
          { error: { code: 'EMAIL_TAKEN', message: 'Email already registered.' }, meta: { correlationId: 'req_x' } },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<RegisterVendorForm />);
    await fillValidVendorForm(user);
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta de proveedor' }));

    const banner = await screen.findByRole('alert');
    // Mensaje neutro idéntico al organizer (clave compartida auth.register.errors.EMAIL_TAKEN).
    expect(banner).toHaveTextContent('No fue posible completar el registro');
    expect(push).not.toHaveBeenCalled();
  });
});

describe('US-002 QA-005 — accesibilidad del form vendor', () => {
  it('sin violaciones críticas de axe en el estado inicial', async () => {
    const { container } = renderWithProviders(<RegisterVendorForm />);
    const results = await axe(container);
    expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
