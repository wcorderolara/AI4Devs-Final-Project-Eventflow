// Header público (screen Stitch «EventFlow - Inicio»): barra sticky con marca, anclas de la
// landing, selector de idioma y acciones que dependen de la sesión resuelta en el servidor.
//
// Lo que se protege aquí: que el visitante anónimo pueda entrar o registrarse, que quien ya
// tiene sesión no reciba esas invitaciones otra vez, y que la navegación mobile sea usable con
// teclado (abrir, cerrar con Escape, devolver el foco al trigger).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import esLatamNavigation from '@/messages/es-LATAM/navigation.json';
import type { SessionClaims } from '@/shared/authorization';
import { PublicHeader } from '@/shared/navigation';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
}));

const ANONYMOUS: SessionClaims = { isAuthenticated: false, role: null };
const nav = esLatamNavigation.public;

function renderHeader(claims: SessionClaims = ANONYMOUS) {
  // El selector de idioma es cliente y consume React Query: el header lo compone, así que el
  // test monta el mismo contexto que la app.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <NextIntlClientProvider
      locale="es-LATAM"
      messages={{ common: esLatamCommon, navigation: esLatamNavigation }}
      timeZone="UTC"
    >
      <QueryClientProvider client={queryClient}>
        <PublicHeader claims={claims} />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

function headerLinks(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
}

describe('<PublicHeader> — estado anónimo', () => {
  it('ofrece iniciar sesión y crear cuenta', () => {
    const { container } = renderHeader();
    const hrefs = headerLinks(container);
    expect(hrefs).toContain('/login');
    expect(hrefs).toContain('/register');
  });

  it('expone la marca y el landmark de navegación con nombre accesible', () => {
    renderHeader();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: nav.nav.label }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: esLatamNavigation.logo.label })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('las anclas apuntan a secciones de la propia landing', () => {
    const { container } = renderHeader();
    const hrefs = headerLinks(container);
    for (const anchor of ['/#how-it-works', '/#features', '/#for-vendors']) {
      expect(hrefs).toContain(anchor);
    }
    expect(hrefs).toContain('/vendors');
  });

  // El header se monta también en `/vendors`. Con anclas relativas (`#features`) el destino
  // sería `/vendors#features`: un ancla inexistente, el clic no navega y el visitante se queda
  // encerrado en el directorio. Deben ser absolutas para volver siempre a la landing.
  it('ninguna ancla es relativa: se puede volver a la landing desde cualquier página pública', () => {
    const { container } = renderHeader();
    const anchors = headerLinks(container).filter((href) => href.includes('#'));
    expect(anchors.length).toBeGreaterThan(0);
    for (const href of anchors) {
      expect(href, `${href} es relativa`).toMatch(/^\/#/);
    }
  });
});

describe('<PublicHeader> — estado autenticado', () => {
  it.each([
    ['organizer', '/organizer'],
    ['vendor', '/vendor'],
    ['admin', '/admin'],
  ] as const)('%s recibe la acción de su workspace', (role, href) => {
    const { container } = renderHeader({ isAuthenticated: true, role });
    expect(headerLinks(container)).toContain(href);
  });

  it.each(['organizer', 'vendor', 'admin'] as const)(
    'a %s no se le vuelve a proponer iniciar sesión ni registrarse',
    (role) => {
      const { container } = renderHeader({ isAuthenticated: true, role });
      const hrefs = headerLinks(container);
      expect(hrefs).not.toContain('/login');
      expect(hrefs).not.toContain('/register');
    },
  );
});

describe('<PublicHeader> — navegación mobile', () => {
  it('abre el panel, lo cierra con Escape y devuelve el foco al trigger', async () => {
    const user = userEvent.setup();
    renderHeader();

    const trigger = screen.getByRole('button', { name: esLatamNavigation.topbar.menuOpen });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    const dialog = await screen.findByRole('dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // El panel repite los destinos públicos y añade las acciones al pie.
    expect(within(dialog).getByRole('link', { name: nav.nav.howItWorks })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: nav.cta.register })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('se cierra con el botón de cierre', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: esLatamNavigation.topbar.menuOpen }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: esLatamNavigation.mobile.close }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('activar un ancla cierra el panel: no se queda tapando la sección de destino', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: esLatamNavigation.topbar.menuOpen }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('link', { name: nav.nav.features }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('el selector de idioma sigue disponible dentro del panel', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: esLatamNavigation.topbar.menuOpen }));
    const dialog = await screen.findByRole('dialog');
    // En la barra el selector se oculta bajo `sm`; el producto tiene cuatro locales, así que
    // no puede quedarse sin punto de acceso en móvil.
    expect(within(dialog).getByTestId('language-selector-current')).toBeInTheDocument();
  });

  it('el trigger es alcanzable con teclado y abre el panel con Enter', async () => {
    const user = userEvent.setup();
    renderHeader();

    const trigger = screen.getByRole('button', { name: esLatamNavigation.topbar.menuOpen });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
