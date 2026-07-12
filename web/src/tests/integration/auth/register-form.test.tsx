// US-001 / QA-001(FE) + QA-005 — RegisterOrganizerForm: validación Zod espejo (EC-02/EC-03),
// captcha gate, happy path (AC-01), mapeo de errores del backend (AC-03/EC-01) y accesibilidad
// (axe + atributos ARIA). MSW intercepta `POST /api/v1/auth/register`.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterOrganizerForm } from '@/features/auth';
import esLatamAuth from '@/messages/es-LATAM/auth.json';
import { server } from '@/tests/msw/server';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));

afterEach(() => {
  push.mockClear();
});

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <NextIntlClientProvider locale="es-LATAM" messages={{ auth: esLatamAuth }}>
      <QueryClientProvider client={queryClient}>
        <RegisterOrganizerForm />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText('Nombre completo'), 'Ana Pérez');
  await user.type(screen.getByLabelText('Correo electrónico'), 'ana@eventflow.test');
  await user.type(screen.getByLabelText('Contraseña'), 'segura12345');
  await user.click(screen.getByLabelText('Acepto los términos y la política de privacidad'));
  await user.click(screen.getByLabelText('No soy un robot'));
}

describe('US-001 FE-002/FE-003 — estados y validación', () => {
  it('submit deshabilitado hasta resolver el captcha (EC-01 preventivo)', async () => {
    const user = userEvent.setup();
    renderForm();
    const submit = screen.getByRole('button', { name: 'Crear mi cuenta' });
    expect(submit).toBeDisabled();
    await user.click(screen.getByLabelText('No soy un robot'));
    expect(submit).toBeEnabled();
  });

  it('EC-02: contraseña débil → error de campo accesible, sin request', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Nombre completo'), 'Ana Pérez');
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@eventflow.test');
    await user.type(screen.getByLabelText('Contraseña'), 'corta1');
    await user.click(screen.getByLabelText('Acepto los términos y la política de privacidad'));
    await user.click(screen.getByLabelText('No soy un robot'));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));

    const field = screen.getByLabelText('Contraseña');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('La contraseña no cumple con los requisitos')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('EC-02/VR-02: contraseña igual al localpart del email → error dedicado', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Nombre completo'), 'Ana Pérez');
    await user.type(screen.getByLabelText('Correo electrónico'), 'Password12@eventflow.test');
    await user.type(screen.getByLabelText('Contraseña'), 'password12');
    await user.click(screen.getByLabelText('Acepto los términos y la política de privacidad'));
    await user.click(screen.getByLabelText('No soy un robot'));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));

    expect(
      await screen.findByText('La contraseña no puede ser igual a la parte local de tu correo'),
    ).toBeInTheDocument();
  });

  it('EC-03: email mal formado → error de campo sin request', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Nombre completo'), 'Ana Pérez');
    await user.type(screen.getByLabelText('Correo electrónico'), 'no-es-email');
    await user.type(screen.getByLabelText('Contraseña'), 'segura12345');
    await user.click(screen.getByLabelText('Acepto los términos y la política de privacidad'));
    await user.click(screen.getByLabelText('No soy un robot'));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));

    expect(await screen.findByText('Correo inválido')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('VR-04: términos sin aceptar → error dedicado', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Nombre completo'), 'Ana Pérez');
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@eventflow.test');
    await user.type(screen.getByLabelText('Contraseña'), 'segura12345');
    await user.click(screen.getByLabelText('No soy un robot'));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));

    expect(
      await screen.findByText('Debes aceptar los términos y la política de privacidad'),
    ).toBeInTheDocument();
  });
});

describe('US-001 FE-004 — mutation y mapeo de errores', () => {
  it('AC-01: happy path → redirige al dashboard del organizador', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/organizer'));
  });

  it('AC-03: 409 EMAIL_TAKEN → banner neutro sin datos del usuario existente', async () => {
    server.use(
      http.post('*/api/v1/auth/register', () =>
        HttpResponse.json(
          { error: { code: 'EMAIL_TAKEN', message: 'Email already registered.' }, meta: { correlationId: 'req_x' } },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('No fue posible completar el registro');
    expect(push).not.toHaveBeenCalled();
  });

  it('EC-01: 400 CAPTCHA_INVALID → banner + widget de captcha reiniciado', async () => {
    server.use(
      http.post('*/api/v1/auth/register', () =>
        HttpResponse.json(
          { error: { code: 'CAPTCHA_INVALID', message: 'Security verification failed.' }, meta: { correlationId: 'req_x' } },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Verificación de seguridad fallida. Vuelve a intentarlo.');
    // El checkbox del widget se desmarca (token consumido) y el submit vuelve a bloquearse.
    expect(screen.getByLabelText('No soy un robot')).not.toBeChecked();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Crear mi cuenta' })).toBeDisabled());
  });

  it('429 RATE_LIMIT_EXCEEDED → banner de reintento posterior', async () => {
    server.use(
      http.post('*/api/v1/auth/register', () =>
        HttpResponse.json(
          { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' }, meta: { correlationId: 'req_x' } },
          { status: 429 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos. Vuelve a intentarlo más tarde.');
  });
});

describe('US-001 QA-005 — accesibilidad', () => {
  it('sin violaciones críticas de axe en el estado inicial', async () => {
    const { container } = renderForm();
    const results = await axe(container);
    expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  it('labels asociados y error enlazado por aria-describedby (EC-02)', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Contraseña'), 'corta1');
    await user.click(screen.getByLabelText('No soy un robot'));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));

    const field = await screen.findByLabelText('Contraseña');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(field.getAttribute('aria-describedby')).toContain('reg-password-error');
  });
});
