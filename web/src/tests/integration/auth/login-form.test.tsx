// US-003 / FE-002..005 + QA-005(a11y) — LoginForm: error genérico anti-enumeración (EC-01),
// captcha condicional que aparece solo cuando el backend lo exige (EC-02), redirección por rol
// (AC-02), banner 429 con Retry-After (AC-05), validación de `from` (open redirect) y axe.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginForm, safeInternalPath, roleHome } from '@/features/auth';
import enAuth from '@/messages/en/auth.json';
import esLatamAuth from '@/messages/es-LATAM/auth.json';
import { loginSuccessEnvelope } from '@/tests/msw/handlers/auth';
import { server } from '@/tests/msw/server';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));

afterEach(() => {
  push.mockClear();
});

function renderLogin(from?: string, locale: 'es-LATAM' | 'en' = 'es-LATAM') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ auth: locale === 'en' ? enAuth : esLatamAuth }}
    >
      <QueryClientProvider client={queryClient}>
        <LoginForm from={from} />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

async function submitCredentials(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText('Correo electrónico'), 'ana@eventflow.test');
  await user.type(screen.getByLabelText('Contraseña'), 'segura12345');
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

function loginEnvelopeWithRole(role: 'organizer' | 'vendor' | 'admin') {
  return { ...loginSuccessEnvelope, data: { ...loginSuccessEnvelope.data, role } };
}

describe('US-003 FE-002/FE-005 — flujo de login', () => {
  it('AC-01/AC-02: login exitoso redirige al dashboard del rol (organizer)', async () => {
    const user = userEvent.setup();
    renderLogin();
    await submitCredentials(user);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/organizer'));
  });

  it('AC-02: rol vendor y admin redirigen a su layout', async () => {
    for (const role of ['vendor', 'admin'] as const) {
      push.mockClear();
      server.use(
        http.post('*/api/v1/auth/login', () =>
          HttpResponse.json(loginEnvelopeWithRole(role), { status: 200 }),
        ),
      );
      const user = userEvent.setup();
      const { unmount } = renderLogin();
      await submitCredentials(user);
      await waitFor(() => expect(push).toHaveBeenCalledWith(`/${role}`));
      unmount();
    }
  });

  it('el captcha NO se renderiza en el estado inicial (condicional N=3)', () => {
    renderLogin();
    expect(screen.queryByLabelText('No soy un robot')).not.toBeInTheDocument();
  });

  it('EC-01: 401 → mensaje genérico sin distinguir email/password', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          {
            error: { code: 'AUTHENTICATION_REQUIRED', message: 'Invalid credentials' },
            meta: { correlationId: 'r' },
          },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderLogin();
    await submitCredentials(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
    expect(push).not.toHaveBeenCalled();
  });

  it('EC-02: 400 CAPTCHA_REQUIRED → aparece el widget y el submit exige token', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          {
            error: { code: 'CAPTCHA_REQUIRED', message: 'Captcha verification is required.' },
            meta: { correlationId: 'r' },
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderLogin();
    await submitCredentials(user);

    const widget = await screen.findByLabelText('No soy un robot');
    expect(widget).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled();

    // Resolver el fake captcha rehabilita el submit; el siguiente intento envía el token y entra.
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(loginSuccessEnvelope, { status: 200 }),
      ),
    );
    await user.click(widget);
    const submit = screen.getByRole('button', { name: 'Iniciar sesión' });
    expect(submit).toBeEnabled();
    await user.click(submit);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/organizer'));
  });

  it('AC-05: 429 → banner con segundos de Retry-After', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          {
            error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
            meta: { correlationId: 'r' },
          },
          { status: 429, headers: { 'Retry-After': '42' } },
        ),
      ),
    );
    const user = userEvent.setup();
    renderLogin();
    await submitCredentials(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Vuelve a intentarlo en 42 segundos',
    );
  });

  it('honra `from` interno validado por encima del dashboard del rol', async () => {
    const user = userEvent.setup();
    renderLogin('/organizer/events?page=2');
    await submitCredentials(user);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/organizer/events?page=2'));
  });
});

describe('US-003 — safeInternalPath / roleHome (open redirect + AC-02)', () => {
  it('acepta solo rutas internas', () => {
    expect(safeInternalPath('/organizer/events')).toBe('/organizer/events');
    expect(safeInternalPath('https://evil.com')).toBeNull();
    expect(safeInternalPath('//evil.com')).toBeNull();
    expect(safeInternalPath('javascript:alert(1)')).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
  });
  it('mapea rol → dashboard', () => {
    expect(roleHome('organizer')).toBe('/organizer');
    expect(roleHome('vendor')).toBe('/vendor');
    expect(roleHome('admin')).toBe('/admin');
  });
});

describe('US-003 — validación de cliente, envío y estado pendiente', () => {
  it('VR-01: email vacío/ inválido no dispara la petición y se asocia al campo', async () => {
    const calls: string[] = [];
    server.use(
      http.post('*/api/v1/auth/login', () => {
        calls.push('called');
        return HttpResponse.json(loginSuccessEnvelope, { status: 200 });
      }),
    );
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Correo electrónico'), 'no-es-un-email');
    await user.type(screen.getByLabelText('Contraseña'), 'segura12345');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    const email = screen.getByLabelText('Correo electrónico');
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
    const errorId = email.getAttribute('aria-describedby');
    expect(document.getElementById(errorId ?? '')).toHaveTextContent('Correo inválido');
    expect(calls).toHaveLength(0);
  });

  it('VR-02: contraseña vacía no dispara la petición', async () => {
    const calls: string[] = [];
    server.use(
      http.post('*/api/v1/auth/login', () => {
        calls.push('called');
        return HttpResponse.json(loginSuccessEnvelope, { status: 200 });
      }),
    );
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@eventflow.test');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    const password = screen.getByLabelText('Contraseña');
    await waitFor(() => expect(password).toHaveAttribute('aria-invalid', 'true'));
    expect(calls).toHaveLength(0);
  });

  it('Enter en el campo de contraseña envía el formulario', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@eventflow.test');
    await user.type(screen.getByLabelText('Contraseña'), 'segura12345{Enter}');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/organizer'));
  });

  it('no permite un segundo envío mientras la petición está pendiente', async () => {
    let calls = 0;
    server.use(
      http.post('*/api/v1/auth/login', async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json(loginSuccessEnvelope, { status: 200 });
      }),
    );
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@eventflow.test');
    await user.type(screen.getByLabelText('Contraseña'), 'segura12345');

    const submit = screen.getByRole('button', { name: 'Iniciar sesión' });
    await user.click(submit);
    // Mientras pende: el botón queda bloqueado y anuncia el estado; un segundo clic no reenvía.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Iniciando sesión…' })).toBeDisabled(),
    );
    await user.click(screen.getByRole('button', { name: 'Iniciando sesión…' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/organizer'));
    expect(calls).toBe(1);
  });

  it('normaliza el email (sin espacios) y NO envía captchaToken cuando el backend no lo exige', async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post('*/api/v1/auth/login', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(loginSuccessEnvelope, { status: 200 });
      }),
    );
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Correo electrónico'), '  ana@eventflow.test  ');
    await user.type(screen.getByLabelText('Contraseña'), 'segura12345');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(body.email).toBe('ana@eventflow.test');
    expect(body).not.toHaveProperty('captchaToken');
  });

  it('EC-02: tras CAPTCHA_REQUIRED el reintento incluye el captchaToken en el payload', async () => {
    let calls = 0;
    let secondBody: Record<string, unknown> = {};
    server.use(
      http.post('*/api/v1/auth/login', async ({ request }) => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json(
            {
              error: { code: 'CAPTCHA_REQUIRED', message: 'Captcha required' },
              meta: { correlationId: 'r' },
            },
            { status: 400 },
          );
        }
        secondBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(loginSuccessEnvelope, { status: 200 });
      }),
    );
    const user = userEvent.setup();
    renderLogin();
    await submitCredentials(user);

    await user.click(await screen.findByLabelText('No soy un robot'));
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/organizer'));
    expect(secondBody.captchaToken).toBe('__test__');
  });
});

describe('US-003 — errores seguros y sesión', () => {
  it('fallo de red → mensaje recuperable, sin exponer el error crudo', async () => {
    server.use(http.post('*/api/v1/auth/login', () => HttpResponse.error()));
    const user = userEvent.setup();
    renderLogin();
    await submitCredentials(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ocurrió un error inesperado. Intenta de nuevo.');
    expect(push).not.toHaveBeenCalled();
  });

  it('EC-01: tras un error recuperable el email se conserva y el foco va al aviso', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          {
            error: { code: 'AUTHENTICATION_REQUIRED', message: 'Invalid credentials' },
            meta: { correlationId: 'r' },
          },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderLogin();
    await submitCredentials(user);

    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(alert).toHaveFocus());
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('ana@eventflow.test');
  });

  it('SEC-06: el login no escribe nada en localStorage ni sessionStorage', async () => {
    const localSet = vi.spyOn(Storage.prototype, 'setItem');
    const user = userEvent.setup();
    renderLogin();
    await submitCredentials(user);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/organizer'));

    expect(localSet).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    localSet.mockRestore();
  });

  it('AC-02: la redirección usa el rol del backend, no un valor del formulario', async () => {
    // El backend responde `admin` aunque el email sea el de una organizadora: manda la sesión.
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(loginEnvelopeWithRole('admin'), { status: 200 }),
      ),
    );
    const user = userEvent.setup();
    renderLogin();
    await submitCredentials(user);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin'));
  });

  it('EC-04: un `from` externo se descarta y se cae al dashboard del rol', async () => {
    const user = userEvent.setup();
    renderLogin('https://evil.com/steal');
    await submitCredentials(user);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/organizer'));
  });
});

describe('US-003 — i18n', () => {
  it('los textos visibles vienen del catálogo activo (en)', () => {
    renderLogin(undefined, 'en');
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(screen.getByRole('link', { name: 'Forgot my password' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });
});

describe('US-003 QA-005 — accesibilidad', () => {
  it('sin violaciones críticas de axe en el estado inicial', async () => {
    const { container } = renderLogin();
    const results = await axe(container);
    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  });
});
