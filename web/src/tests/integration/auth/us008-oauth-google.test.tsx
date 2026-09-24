// US-008 (PB-P4-001 / FE-001, FE-002, FE-003, QA-004) — OAuth Google en el frontend.
// Cubre: botón "Continuar con Google" (label accesible + navegación server-driven), aviso de
// cancelación en /login (EC-02), selección de rol con validación requerida (VR-03) y confirmación
// de vinculación (AC-03), más chequeos de accesibilidad (axe) del botón y las pantallas.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GoogleSignInButton,
  LoginForm,
  RoleSelectorOnSignup,
  LinkAccountConfirmation,
} from '@/features/auth';
import esLatamAuth from '@/messages/es-LATAM/auth.json';
import { loginSuccessEnvelope } from '@/tests/msw/handlers/auth';
import { server } from '@/tests/msw/server';
import { auditA11y, formatViolations } from '@/tests/a11y/helpers/axe';

const push = vi.fn();
const refresh = vi.fn();
let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh, prefetch: vi.fn() }),
  useSearchParams: () => searchParams,
}));

afterEach(() => {
  push.mockClear();
  refresh.mockClear();
  searchParams = new URLSearchParams();
  vi.restoreAllMocks();
});

function wrap(node: React.ReactNode): React.JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={{ auth: esLatamAuth }}>
      <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
    </NextIntlClientProvider>
  );
}

function envelopeWithRole(role: 'organizer' | 'vendor'): Record<string, unknown> {
  return { ...loginSuccessEnvelope, data: { ...loginSuccessEnvelope.data, role } };
}

describe('US-008 FE-001 — GoogleSignInButton', () => {
  it('AC-01: renderiza con label accesible y navega al endpoint backend (server-driven)', async () => {
    // `window.location.assign` no es reconfigurable en jsdom: se sustituye el objeto `location`
    // completo y se restaura al final.
    const original = window.location;
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, assign },
    });
    try {
      const user = userEvent.setup();
      render(wrap(<GoogleSignInButton />));
      const button = screen.getByRole('button', { name: 'Continuar con Google' });
      expect(button).toBeInTheDocument();
      await user.click(button);
      expect(assign).toHaveBeenCalledWith('/api/v1/auth/google');
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });

  it('QA-004: el botón no tiene violaciones de accesibilidad críticas (axe)', async () => {
    const { container } = render(wrap(<GoogleSignInButton />));
    const { critical } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
  });
});

describe('US-008 FE-001 — cancelación en /login (EC-02)', () => {
  it('muestra aviso neutro cuando ?oauth=cancelled', () => {
    searchParams = new URLSearchParams('oauth=cancelled');
    render(wrap(<LoginForm />));
    expect(
      screen.getByText(
        'No fue posible iniciar sesión con Google. Puedes intentar de nuevo o usar tu correo.',
      ),
    ).toBeInTheDocument();
  });

  it('no muestra el aviso sin el parámetro', () => {
    render(wrap(<LoginForm />));
    expect(screen.queryByText(/No fue posible iniciar sesión con Google/)).not.toBeInTheDocument();
  });
});

describe('US-008 FE-002 — RoleSelectorOnSignup', () => {
  it('VR-03: sin rol seleccionado muestra error y no navega', async () => {
    const user = userEvent.setup();
    render(wrap(<RoleSelectorOnSignup />));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Selecciona un rol para continuar.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('AC-02: selecciona rol → crea cuenta y redirige al dashboard del rol', async () => {
    server.use(
      http.post('*/api/v1/auth/google/complete-signup', () =>
        HttpResponse.json(envelopeWithRole('vendor'), { status: 201 }),
      ),
    );
    const user = userEvent.setup();
    render(wrap(<RoleSelectorOnSignup />));
    await user.click(screen.getByRole('radio', { name: /Soy proveedor/ }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/vendor'));
  });

  it('QA-004: sin violaciones de accesibilidad críticas (axe)', async () => {
    const { container } = render(wrap(<RoleSelectorOnSignup />));
    const { critical } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
  });
});

describe('US-008 FE-003 — LinkAccountConfirmation', () => {
  it('AC-03: confirmar vincula y redirige al dashboard', async () => {
    server.use(
      http.post('*/api/v1/auth/google/confirm-link', () =>
        HttpResponse.json(envelopeWithRole('organizer'), { status: 200 }),
      ),
    );
    const user = userEvent.setup();
    render(wrap(<LinkAccountConfirmation />));
    await user.click(screen.getByRole('button', { name: 'Sí, vincular mi cuenta' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/organizer'));
  });

  it('AC-03: cancelar no vincula y vuelve a /login', async () => {
    const user = userEvent.setup();
    render(wrap(<LinkAccountConfirmation />));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(push).toHaveBeenCalledWith('/login');
  });
});
