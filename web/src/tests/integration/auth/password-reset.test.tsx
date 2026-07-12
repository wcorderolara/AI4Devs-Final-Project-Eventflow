// US-004 / QA-003 — ForgotPasswordForm y ResetPasswordForm: 202 neutro (AC-01/AC-03), flujo de
// nueva contraseña → redirect a /login?reset=success (AC-02), catálogo EC-01..03 en UI
// (TokenExpiredBanner con CTA, TOKEN_USED/TOKEN_INVALID), política de contraseña y axe.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordForm, ResetPasswordForm } from '@/features/auth';
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

describe('US-004 FE-001 — ForgotPasswordForm (202 neutro)', () => {
  it('AC-01/AC-03: submit con captcha → mensaje neutro (idéntico exista o no el email)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordForm />);
    const submit = screen.getByRole('button', { name: 'Enviar enlace' });
    expect(submit).toBeDisabled(); // captcha obligatorio (SEC-01)

    await user.type(screen.getByLabelText('Correo electrónico'), 'cualquiera@eventflow.test');
    await user.click(screen.getByLabelText('No soy un robot'));
    await user.click(submit);

    expect(
      await screen.findByText('Si el email existe, recibirás un enlace para restablecer tu contraseña.'),
    ).toBeInTheDocument();
  });

  it('sin violaciones críticas de axe', async () => {
    const { container } = renderWithProviders(<ForgotPasswordForm />);
    const results = await axe(container);
    expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});

describe('US-004 FE-002/FE-004 — ResetPasswordForm', () => {
  it('AC-02: contraseña válida → 204 → redirige a /login?reset=success', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm token="tok-valido" />);
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClave99');
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/login?reset=success'));
  });

  it('AC-05: política incumplida → error de campo, sin request', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm token="tok-valido" />);
    await user.type(screen.getByLabelText('Nueva contraseña'), 'corta1');
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));
    expect(await screen.findByText('La contraseña no cumple con los requisitos')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('EC-01: 410 GONE_TOKEN_EXPIRED → TokenExpiredBanner con CTA "Solicitar nuevo enlace"', async () => {
    server.use(
      http.post('*/api/v1/auth/password/reset', () =>
        HttpResponse.json(
          { error: { code: 'GONE_TOKEN_EXPIRED', message: 'The reset link has expired.' }, meta: { correlationId: 'r' } },
          { status: 410 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm token="tok-expirado" />);
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClave99');
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));

    expect(await screen.findByText('El enlace expiró')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar nuevo enlace' })).toHaveAttribute('href', '/forgot-password');
  });

  it('EC-02: 400 TOKEN_USED → mensaje con CTA a nuevo enlace', async () => {
    server.use(
      http.post('*/api/v1/auth/password/reset', () =>
        HttpResponse.json(
          { error: { code: 'TOKEN_USED', message: 'Already used.' }, meta: { correlationId: 'r' } },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm token="tok-usado" />);
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClave99');
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Este enlace ya fue utilizado');
  });

  it('EC-03: sin token en el enlace → estado inválido con CTA (sin form)', () => {
    renderWithProviders(<ResetPasswordForm />);
    expect(screen.getByRole('alert')).toHaveTextContent('El enlace no es válido');
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
  });

  it('sin violaciones críticas de axe', async () => {
    const { container } = renderWithProviders(<ResetPasswordForm token="tok" />);
    const results = await axe(container);
    expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
