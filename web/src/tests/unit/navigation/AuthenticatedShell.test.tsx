import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionState } from '@/shared/auth-session';
import type { Role } from '@/shared/authorization';
import { AuthenticatedShell } from '@/shared/navigation';
import commonEn from '@/messages/en/common.json';
import navigationEn from '@/messages/en/navigation.json';
import commonEs from '@/messages/es-LATAM/common.json';
import navigationEs from '@/messages/es-LATAM/navigation.json';

/**
 * Comportamiento público del shell autenticado compartido por los tres roles.
 *
 * Se ejercita a través de lo que ve la persona usuaria (landmarks, enlaces, nombres accesibles),
 * no de la implementación: el objetivo es que la navegación dependa de **la sesión** y que
 * desktop y drawer salgan de la misma fuente.
 */

const pathname = vi.hoisted(() => ({ value: '/organizer' }));
const useSessionMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/shared/auth-session', () => ({
  useSession: useSessionMock,
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));
// `useLocaleSwitcher` (LanguageSelector del Topbar) importa el hook por su ruta profunda.
vi.mock('@/shared/auth-session/useSession', () => ({ useSession: useSessionMock }));

function session(overrides: Partial<SessionState> = {}): SessionState {
  return {
    user: null,
    role: null,
    isAuthenticated: false,
    isLoading: false,
    isError: false,
    refetch: () => {},
    ...overrides,
  };
}

function authenticated(role: Role, overrides: Partial<SessionState> = {}): SessionState {
  return session({
    role,
    isAuthenticated: true,
    user: { id: 'u1', email: 'ana@example.com', displayName: 'Ana' },
    ...overrides,
  });
}

const MESSAGES = {
  'es-LATAM': { navigation: navigationEs, common: commonEs },
  en: { navigation: navigationEn, common: commonEn },
} as const;

function renderShell({
  initialRole = null,
  locale = 'es-LATAM',
}: { initialRole?: Role | null; locale?: keyof typeof MESSAGES } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        <AuthenticatedShell initialRole={initialRole}>
          <p>Contenido de la página</p>
        </AuthenticatedShell>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

/** Landmark `<nav>` de la sidebar desktop (el drawer sólo existe en el DOM cuando está abierto). */
function sidebar(name: string) {
  return screen.getByRole('navigation', { name });
}

/** Destinos (`href`) de un landmark de navegación, en orden. */
function hrefsIn(nav: HTMLElement): string[] {
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href') ?? '');
}

const ORGANIZER_NAV = 'Navegación de organizador';
const VENDOR_NAV = 'Navegación de proveedor';
const ADMIN_NAV = 'Navegación de administración';

beforeEach(() => {
  pathname.value = '/organizer';
  useSessionMock.mockReturnValue(session());
});

describe('<AuthenticatedShell> — estructura común', () => {
  it('monta los landmarks del shell y el área de contenido', () => {
    useSessionMock.mockReturnValue(authenticated('organizer'));
    renderShell();

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(sidebar(ORGANIZER_NAV)).toBeInTheDocument();
    expect(screen.getByText('Contenido de la página')).toBeInTheDocument();
  });

  it.each(['organizer', 'vendor', 'admin'] as const)(
    'expone las acciones de cuenta comunes para %s',
    async (role) => {
      useSessionMock.mockReturnValue(authenticated(role));
      renderShell();

      await userEvent.click(screen.getByRole('button', { name: /Menú de usuario/ }));
      expect(screen.getByRole('menuitem', { name: 'Mi perfil' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument();
    },
  );

  it('los controles sólo-icono tienen nombre accesible', () => {
    useSessionMock.mockReturnValue(authenticated('organizer'));
    renderShell();

    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument();
  });
});

describe('<AuthenticatedShell> — navegación por rol', () => {
  it('organizer ve sus destinos y ninguno de vendor ni de administración', () => {
    useSessionMock.mockReturnValue(authenticated('organizer'));
    renderShell();

    const nav = sidebar(ORGANIZER_NAV);
    expect(within(nav).getByRole('link', { name: 'Eventos' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Proveedores' })).toBeInTheDocument();

    const hrefs = hrefsIn(nav);
    expect(hrefs.some((href) => href.startsWith('/admin'))).toBe(false);
    expect(hrefs.some((href) => href.startsWith('/vendor'))).toBe(false);
    expect(screen.queryByRole('navigation', { name: VENDOR_NAV })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Aprobación de proveedores' }),
    ).not.toBeInTheDocument();
  });

  it('vendor ve sus destinos y ninguno de organizer ni de administración', () => {
    pathname.value = '/vendor';
    useSessionMock.mockReturnValue(authenticated('vendor'));
    renderShell();

    const nav = sidebar(VENDOR_NAV);
    expect(within(nav).getByRole('link', { name: 'Portafolio' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Cotizaciones' })).toBeInTheDocument();

    const hrefs = hrefsIn(nav);
    expect(hrefs.some((href) => href.startsWith('/admin'))).toBe(false);
    expect(hrefs.some((href) => href.startsWith('/organizer'))).toBe(false);
  });

  it('admin ve la navegación agrupada y ningún recurso de organizer ni de vendor', () => {
    pathname.value = '/admin/metrics';
    useSessionMock.mockReturnValue(authenticated('admin'));
    renderShell();

    const nav = sidebar(ADMIN_NAV);
    expect(
      within(nav).getByRole('link', { name: 'Aprobación de proveedores' }),
    ).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Usuarios' })).toBeInTheDocument();
    // Los grupos son secciones con nombre accesible propio.
    expect(within(nav).getByRole('region', { name: 'Moderación' })).toBeInTheDocument();

    const hrefs = hrefsIn(nav);
    expect(hrefs.every((href) => href.startsWith('/admin'))).toBe(true);
  });

  it('la URL no decide el rol: un organizer en una ruta /vendor sigue viendo su navegación', () => {
    pathname.value = '/vendor/quotes';
    useSessionMock.mockReturnValue(authenticated('organizer'));
    renderShell();

    expect(sidebar(ORGANIZER_NAV)).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: VENDOR_NAV })).not.toBeInTheDocument();
  });

  it('marca la ruta activa con aria-current="page"', () => {
    pathname.value = '/organizer/events';
    useSessionMock.mockReturnValue(authenticated('organizer'));
    renderShell();

    const nav = sidebar(ORGANIZER_NAV);
    expect(within(nav).getByRole('link', { name: 'Eventos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // `exact: true` en el dashboard evita que una ruta hija lo active por prefijo.
    expect(within(nav).getByRole('link', { name: 'Panel' })).not.toHaveAttribute('aria-current');
  });
});

describe('<AuthenticatedShell> — resolución del rol', () => {
  it('mientras la sesión carga usa el claim del servidor, sin mostrar opciones de otros roles', () => {
    pathname.value = '/vendor';
    useSessionMock.mockReturnValue(session({ isLoading: true }));
    renderShell({ initialRole: 'vendor' });

    const nav = sidebar(VENDOR_NAV);
    expect(hrefsIn(nav).every((href) => href.startsWith('/vendor'))).toBe(true);
    expect(screen.queryByRole('navigation', { name: ORGANIZER_NAV })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: ADMIN_NAV })).not.toBeInTheDocument();
  });

  it('la sesión manda sobre el claim del servidor cuando difieren', () => {
    useSessionMock.mockReturnValue(authenticated('admin'));
    renderShell({ initialRole: 'organizer' });

    expect(sidebar(ADMIN_NAV)).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: ORGANIZER_NAV })).not.toBeInTheDocument();
  });

  it('sesión resuelta sin rol → shell sin navegación (no cae a organizer)', () => {
    useSessionMock.mockReturnValue(session());
    renderShell({ initialRole: 'organizer' });

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    // Sin navegación tampoco se ofrece abrir el drawer.
    expect(screen.queryByRole('button', { name: 'Abrir menú' })).not.toBeInTheDocument();
    expect(screen.getByText('Contenido de la página')).toBeInTheDocument();
  });

  it('rol no soportado → shell sin navegación', () => {
    useSessionMock.mockReturnValue(authenticated('superadmin' as Role));
    renderShell();

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});

describe('<AuthenticatedShell> — drawer mobile', () => {
  it('abre el drawer con los mismos destinos que la sidebar y lo cierra con el botón', async () => {
    useSessionMock.mockReturnValue(authenticated('organizer'));
    renderShell();

    const desktopHrefs = hrefsIn(sidebar(ORGANIZER_NAV));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    const dialog = screen.getByRole('dialog');
    const drawerNav = within(dialog).getByRole('navigation', { name: ORGANIZER_NAV });
    // Misma fuente de navegación: mismos destinos y en el mismo orden.
    expect(hrefsIn(drawerNav)).toEqual(desktopHrefs);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('se cierra con Escape', async () => {
    useSessionMock.mockReturnValue(authenticated('organizer'));
    renderShell();

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('se cierra al navegar a otra ruta', async () => {
    useSessionMock.mockReturnValue(authenticated('organizer'));
    const { rerender } = renderShell();

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    pathname.value = '/organizer/events';
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="es-LATAM" messages={MESSAGES['es-LATAM']}>
          <AuthenticatedShell initialRole={null}>
            <p>Contenido de la página</p>
          </AuthenticatedShell>
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('<AuthenticatedShell> — internacionalización', () => {
  it('traduce labels, nombre del landmark y controles según el locale activo', () => {
    useSessionMock.mockReturnValue(authenticated('organizer'));
    renderShell({ locale: 'en' });

    const nav = screen.getByRole('navigation', { name: 'Organizer navigation' });
    expect(within(nav).getByRole('link', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });
});
