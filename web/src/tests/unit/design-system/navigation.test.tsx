// PB-P2-029 — Componentes de navegación del design system.
//
// Fuente normativa: docs/ux-ui/EventFlow-Component-Foundations.md §20 (AppSidebar, SidebarItem,
// MobileNavigationDrawer, TopBar, UserMenu, LanguageSelector, Breadcrumb, FilterBar) y §37
// (matriz WCAG 2.1 AA: aria-current, focus visible, focus trap, retorno de foco, touch target).
import { Calendar, LayoutDashboard, Store } from 'lucide-react';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppShell,
  AppSidebar,
  AppliedFilterChip,
  Breadcrumb,
  FilterBar,
  LanguageSelector,
  MobileNavigationDrawer,
  MobileNavigationTrigger,
  NotificationBadge,
  NotificationButton,
  SidebarItem,
  TopBar,
  UserMenu,
  type NavigationSection,
} from '@/shared/design-system';
import { MobileNav, Sidebar, ORGANIZER_NAV_ITEMS } from '@/shared/navigation';

const pathname = vi.hoisted(() => ({ value: '/organizer/events' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }));

const LONG_LABEL = 'Gestión de recursos, proveedores y asignaciones del evento corporativo anual';

const SECTIONS: NavigationSection[] = [
  {
    id: 'main',
    label: 'Principal',
    items: [
      { href: '/organizer', label: 'Dashboard', icon: <LayoutDashboard />, active: false },
      {
        href: '/organizer/events',
        label: 'Eventos',
        icon: <Calendar />,
        active: true,
        badge: { count: 12, label: '12 eventos nuevos' },
      },
    ],
  },
  {
    id: 'resources',
    label: 'Recursos',
    items: [{ href: '/organizer/vendors', label: LONG_LABEL, icon: <Store /> }],
  },
];

describe('PB-P2-029 · SidebarItem', () => {
  beforeEach(cleanup);

  it('el ítem activo expone aria-current="page" y el inactivo no', () => {
    render(
      <>
        <SidebarItem item={{ href: '/a', label: 'Activo', icon: <Calendar />, active: true }} />
        <SidebarItem item={{ href: '/b', label: 'Inactivo', icon: <Calendar /> }} />
      </>,
    );
    expect(screen.getByRole('link', { name: 'Activo' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Inactivo' })).not.toHaveAttribute('aria-current');
  });

  it('el estado activo no depende sólo del color: añade peso y marca visual', () => {
    render(
      <SidebarItem item={{ href: '/a', label: 'Activo', icon: <Calendar />, active: true }} />,
    );
    const link = screen.getByRole('link', { name: 'Activo' });
    expect(link.className).toContain('bg-sidebar-item-active');
    expect(link.className).toContain('font-semibold');
    expect(link.querySelector('.bg-action-primary')).not.toBeNull();
  });

  it('el label visible se conserva y el icono es decorativo', () => {
    const { container } = render(
      <SidebarItem item={{ href: '/a', label: 'Eventos', icon: <Calendar /> }} />,
    );
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveTextContent('Eventos');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('el badge opcional se anuncia con su nombre accesible, no sólo con el número', () => {
    render(
      <SidebarItem
        item={{
          href: '/a',
          label: 'Cotizaciones',
          icon: <Calendar />,
          badge: { count: 3, label: '3 cotizaciones nuevas' },
        }}
      />,
    );
    const link = screen.getByRole('link', { name: /Cotizaciones/ });
    expect(link).toHaveAccessibleName('Cotizaciones 3 cotizaciones nuevas');
    expect(link).toHaveTextContent('3');
  });

  it('sin badge cuando el contador es 0', () => {
    render(
      <SidebarItem
        item={{
          href: '/a',
          label: 'Vacío',
          icon: <Calendar />,
          badge: { count: 0, label: 'cero' },
        }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Vacío' })).not.toHaveTextContent('0');
  });

  it('un label traducido largo se conserva íntegro (sin recorte que pierda texto)', () => {
    render(<SidebarItem item={{ href: '/a', label: LONG_LABEL, icon: <Store /> }} />);
    expect(screen.getByRole('link', { name: LONG_LABEL })).toBeInTheDocument();
  });

  it('el ítem recibe foco por teclado y usa el anillo canónico', async () => {
    const user = userEvent.setup();
    render(<SidebarItem item={{ href: '/a', label: 'Enfocable', icon: <Calendar /> }} />);
    const link = screen.getByRole('link', { name: 'Enfocable' });
    await user.tab();
    expect(link).toHaveFocus();
    expect(link.className).toContain('focus-ring');
  });

  it('`disabled` deja de ser link y se anuncia como deshabilitado', () => {
    render(
      <SidebarItem item={{ href: '/a', label: 'Bloqueado', icon: <Calendar />, disabled: true }} />,
    );
    expect(screen.queryByRole('link', { name: 'Bloqueado' })).toBeNull();
    expect(screen.getByText('Bloqueado').closest('[aria-disabled="true"]')).not.toBeNull();
  });
});

describe('PB-P2-029 · AppSidebar', () => {
  beforeEach(cleanup);

  it('expone un landmark de navegación con nombre accesible y grupos etiquetados', () => {
    render(<AppSidebar ariaLabel="Navegación de organizador" sections={SECTIONS} />);
    const nav = screen.getByRole('navigation', { name: 'Navegación de organizador' });
    expect(nav).toBeInTheDocument();
    expect(within(nav).getByRole('heading', { name: 'Principal' })).toBeInTheDocument();
    expect(within(nav).getAllByRole('list')).toHaveLength(2);
  });

  it('sólo renderiza los ítems recibidos: no inventa destinos', () => {
    render(<AppSidebar ariaLabel="Nav" sections={SECTIONS} />);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/organizer',
      '/organizer/events',
      '/organizer/vendors',
    ]);
  });

  it('marca la ruta activa una sola vez', () => {
    render(<AppSidebar ariaLabel="Nav" sections={SECTIONS} />);
    const current = screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current'));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute('href', '/organizer/events');
  });

  it('se oculta por debajo del breakpoint desktop aprobado (lg)', () => {
    const { container } = render(
      <AppSidebar ariaLabel="Nav" sections={SECTIONS} data-testid="sidebar" />,
    );
    const root = container.querySelector('[data-testid="sidebar"]') as HTMLElement;
    expect(root.className).toContain('hidden');
    expect(root.className).toContain('lg:flex');
    expect(root.className).toContain('w-sidebar');
  });

  it('monta header y footer sólo cuando se pasan', () => {
    const { rerender } = render(<AppSidebar ariaLabel="Nav" sections={SECTIONS} />);
    expect(screen.queryByText('Espacio de organizador')).toBeNull();
    rerender(
      <AppSidebar
        ariaLabel="Nav"
        sections={SECTIONS}
        header={<span>Espacio de organizador</span>}
        footer={<span>Pie</span>}
      />,
    );
    expect(screen.getByText('Espacio de organizador')).toBeInTheDocument();
    expect(screen.getByText('Pie')).toBeInTheDocument();
  });

  it('un grupo con label oculto conserva el nombre accesible', () => {
    render(
      <AppSidebar
        ariaLabel="Nav"
        sections={[{ id: 'g', label: 'Oculto', labelHidden: true, items: SECTIONS[0]!.items }]}
      />,
    );
    const heading = screen.getByRole('heading', { name: 'Oculto' });
    expect(heading.className).toContain('sr-only');
  });
});

describe('PB-P2-029 · MobileNavigationDrawer', () => {
  beforeEach(cleanup);

  function Harness({ onCloseSpy }: { onCloseSpy?: () => void }): React.JSX.Element {
    const [open, setOpen] = useState(false);
    return (
      <>
        <MobileNavigationTrigger
          label="Abrir menú"
          isOpen={open}
          onOpen={() => setOpen(true)}
          controls="drawer-panel"
        />
        <MobileNavigationDrawer
          open={open}
          onClose={() => {
            onCloseSpy?.();
            setOpen(false);
          }}
          ariaLabel="Navegación principal"
          title="EventFlow"
          closeLabel="Cerrar"
          sections={SECTIONS}
          panelId="drawer-panel"
          footer={<span>Cerrar sesión</span>}
        />
      </>
    );
  }

  it('cerrado por defecto: no hay diálogo montado', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('el trigger lo abre y describe la relación con el panel', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Abrir menú' });
    expect(trigger).toHaveAttribute('aria-controls', 'drawer-panel');
    await user.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('tiene título accesible y landmark de navegación nombrado', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('EventFlow');
    expect(
      within(dialog).getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument();
  });

  it('Escape cierra el drawer', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('el botón de cierre cierra y devuelve el foco al trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Abrir menú' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('el foco queda atrapado dentro del panel', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const dialog = await screen.findByRole('dialog');
    // Tabulando más veces que elementos focusables hay, el foco nunca sale del diálogo.
    for (let i = 0; i < 10; i += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('bloquea el scroll del body mientras está abierto y lo restaura al cerrar', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const before = document.documentElement.style.overflow;
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
    await screen.findByRole('dialog');
    await waitFor(() => expect(document.documentElement.style.overflow).toBe('hidden'));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.documentElement.style.overflow).toBe(before));
  });

  it('muestra la ruta activa y el pie de cuenta', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('link', { name: /Eventos/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(dialog).getByText('Cerrar sesión')).toBeInTheDocument();
  });
});

describe('PB-P2-029 · desktop y mobile comparten el modelo de navegación', () => {
  beforeEach(cleanup);

  const messages = {
    navigation: {
      mobile: { title: 'EventFlow', close: 'Cerrar' },
      sidebar: {
        organizer: {
          dashboard: 'Dashboard',
          events: 'Eventos',
          vendors: 'Proveedores',
          notifications: 'Notificaciones',
          profile: 'Perfil',
        },
      },
    },
  };

  function hrefsOf(root: HTMLElement): string[] {
    return within(root)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '');
  }

  it('`Sidebar` y `MobileNav` derivan los mismos destinos del mismo `NavItem[]`', async () => {
    const user = userEvent.setup();
    pathname.value = '/organizer/events';

    const { unmount } = render(
      <NextIntlClientProvider locale="es-LATAM" messages={messages}>
        <Sidebar items={ORGANIZER_NAV_ITEMS} ariaLabel="Navegación de organizador" />
      </NextIntlClientProvider>,
    );
    const desktop = hrefsOf(screen.getByRole('navigation', { name: 'Navegación de organizador' }));
    unmount();

    function Mobile(): React.JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <NextIntlClientProvider locale="es-LATAM" messages={messages}>
          <button type="button" onClick={() => setOpen(true)}>
            abrir
          </button>
          <MobileNav
            items={ORGANIZER_NAV_ITEMS}
            isOpen={open}
            onClose={() => setOpen(false)}
            ariaLabel="Navegación de organizador"
          />
        </NextIntlClientProvider>
      );
    }
    render(<Mobile />);
    await user.click(screen.getByRole('button', { name: 'abrir' }));
    const mobile = hrefsOf(await screen.findByRole('dialog'));

    expect(desktop).toEqual(ORGANIZER_NAV_ITEMS.map((item) => item.href));
    expect(mobile).toEqual(desktop);
  });
});

describe('PB-P2-029 · TopBar', () => {
  beforeEach(cleanup);

  it('compone trigger, marca, título y acciones y usa el token de altura', () => {
    render(
      <TopBar
        data-testid="topbar"
        menuTrigger={
          <MobileNavigationTrigger label="Abrir menú" isOpen={false} onOpen={() => {}} />
        }
        brand={<span>EventFlow</span>}
        title="Panel"
        breadcrumb={<Breadcrumb ariaLabel="Ruta" items={[{ label: 'Inicio', href: '/' }]} />}
        actions={<NotificationButton label="Notificaciones, 2 sin leer" count={2} />}
      />,
    );
    const bar = screen.getByTestId('topbar');
    expect(bar.tagName.toLowerCase()).toBe('header');
    expect(bar.className).toContain('h-header');
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument();
    expect(screen.getByText('Panel')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Ruta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notificaciones, 2 sin leer' })).toBeInTheDocument();
  });

  it('el trigger de menú sólo se muestra por debajo de desktop', () => {
    render(
      <TopBar
        menuTrigger={
          <MobileNavigationTrigger label="Abrir menú" isOpen={false} onOpen={() => {}} />
        }
      />,
    );
    expect(screen.getByRole('button', { name: 'Abrir menú' }).className).toContain('lg:hidden');
  });

  it('no añade búsqueda global por su cuenta', () => {
    render(<TopBar brand={<span>EventFlow</span>} />);
    expect(screen.queryByRole('searchbox')).toBeNull();
  });
});

describe('PB-P2-029 · NotificationButton y NotificationBadge', () => {
  beforeEach(cleanup);

  it('el nombre accesible incluye el contador y el badge no lo duplica', () => {
    render(<NotificationButton label="Notificaciones, 5 sin leer" count={5} />);
    const button = screen.getByRole('button', { name: 'Notificaciones, 5 sin leer' });
    expect(button).toHaveAccessibleName('Notificaciones, 5 sin leer');
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('con contador 0 no pinta badge', () => {
    const { container } = render(<NotificationBadge count={0} data-testid="badge" />);
    expect(container.firstChild).toBeNull();
  });

  it('recorta el contador con el tope configurado', () => {
    render(<NotificationBadge count={140} max={99} data-testid="badge" />);
    expect(screen.getByTestId('badge')).toHaveTextContent('99+');
  });

  it('respeta el mínimo táctil y expone loading', () => {
    render(<NotificationButton label="Notificaciones" isLoading />);
    const button = screen.getByRole('button', { name: 'Notificaciones' });
    expect(button.className).toContain('min-h-touch');
    expect(button.className).toContain('min-w-touch');
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('con `href` navega en lugar de actuar', () => {
    render(<NotificationButton label="Notificaciones" href="/organizer/notifications" />);
    expect(screen.getByRole('link', { name: 'Notificaciones' })).toHaveAttribute(
      'href',
      '/organizer/notifications',
    );
  });
});

describe('PB-P2-029 · UserMenu', () => {
  beforeEach(cleanup);

  function renderMenu(onLogout = vi.fn()) {
    render(
      <UserMenu
        triggerLabel="Menú de usuario"
        name="Ana Pérez"
        email="ana@eventflow.com"
        roleLabel="Organizador"
        items={[
          { key: 'profile', label: 'Mi perfil', href: '/organizer/profile' },
          { key: 'logout', label: 'Cerrar sesión', onSelect: onLogout },
        ]}
      />,
    );
    return screen.getByRole('button', { name: /Menú de usuario/ });
  }

  it('el trigger conserva el nombre de la sesión en su nombre accesible', () => {
    const trigger = renderMenu();
    expect(trigger).toHaveAccessibleName('Menú de usuario Ana Pérez');
  });

  it('se abre y navega con teclado', async () => {
    const user = userEvent.setup();
    const trigger = renderMenu();
    trigger.focus();
    await user.keyboard('{Enter}');
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Mi perfil' })).toBeInTheDocument();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveTextContent('Mi perfil');
  });

  it('muestra nombre, email y rol', async () => {
    const user = userEvent.setup();
    const trigger = renderMenu();
    await user.click(trigger);
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('ana@eventflow.com')).toBeInTheDocument();
    expect(within(menu).getByText('Organizador')).toBeInTheDocument();
  });

  it('el ítem de perfil apunta al destino recibido; no se inventan rutas', async () => {
    const user = userEvent.setup();
    const trigger = renderMenu();
    await user.click(trigger);
    expect(await screen.findByRole('menuitem', { name: 'Mi perfil' })).toHaveAttribute(
      'href',
      '/organizer/profile',
    );
    expect(screen.queryByRole('menuitem', { name: /admin/i })).toBeNull();
  });

  it('ejecuta la acción de cerrar sesión', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    const trigger = renderMenu(onLogout);
    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('Escape cierra y devuelve el foco al trigger', async () => {
    const user = userEvent.setup();
    const trigger = renderMenu();
    await user.click(trigger);
    await screen.findByRole('menu');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

describe('PB-P2-029 · LanguageSelector', () => {
  beforeEach(cleanup);

  const OPTIONS = [
    { value: 'es-LATAM', label: 'Español (LATAM)', short: 'es-LATAM' },
    { value: 'es-ES', label: 'Español (España)', short: 'es-ES' },
    { value: 'pt', label: 'Português', short: 'pt' },
    { value: 'en', label: 'English', short: 'en' },
  ];

  it('muestra el locale actual', () => {
    render(
      <LanguageSelector label="Cambiar idioma" value="pt" options={OPTIONS} onChange={() => {}} />,
    );
    expect(screen.getByTestId('language-selector-current')).toHaveTextContent('pt');
  });

  it('ofrece los 4 locales aprobados, cada uno en su propio idioma', async () => {
    const user = userEvent.setup();
    render(
      <LanguageSelector
        label="Cambiar idioma"
        value="es-LATAM"
        options={OPTIONS}
        onChange={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Cambiar idioma' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'Español (LATAM)es-LATAM',
      'Español (España)es-ES',
      'Portuguêspt',
      'Englishen',
    ]);
  });

  it('selecciona un locale y marca el actual como seleccionado', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <LanguageSelector
        label="Cambiar idioma"
        value="es-LATAM"
        options={OPTIONS}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Cambiar idioma' }));
    expect(await screen.findByRole('option', { name: /Español \(LATAM\)/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.click(screen.getByRole('option', { name: /English/ }));
    expect(onChange).toHaveBeenCalledWith('en');
  });

  it('se opera con teclado', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <LanguageSelector
        label="Cambiar idioma"
        value="es-LATAM"
        options={OPTIONS}
        onChange={onChange}
      />,
    );
    screen.getByRole('button', { name: 'Cambiar idioma' }).focus();
    // `ArrowDown` abre el listbox situando el foco en la opción seleccionada; el siguiente
    // `ArrowDown` avanza y `Enter` confirma (patrón ARIA APG listbox).
    await user.keyboard('{ArrowDown}');
    await screen.findByRole('listbox');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('es-ES');
  });

  it('mientras persiste queda deshabilitado y muestra el spinner', () => {
    render(
      <LanguageSelector
        label="Cambiar idioma"
        value="en"
        options={OPTIONS}
        onChange={() => {}}
        isPending
      />,
    );
    expect(screen.getByRole('button', { name: 'Cambiar idioma' })).toBeDisabled();
    expect(screen.getByTestId('language-selector-spinner')).toBeInTheDocument();
  });
});

describe('PB-P2-029 · Breadcrumb', () => {
  beforeEach(cleanup);

  it('es un landmark con lista y marca la página actual', () => {
    render(
      <Breadcrumb
        ariaLabel="Ruta de navegación"
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Eventos', href: '/organizer/events' },
          { label: 'Gala Anual' },
        ]}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Ruta de navegación' });
    expect(within(nav).getByRole('list')).toBeInTheDocument();
    expect(within(nav).getAllByRole('link')).toHaveLength(2);
    expect(within(nav).getByText('Gala Anual')).toHaveAttribute('aria-current', 'page');
  });

  it('sin ítems no renderiza nada', () => {
    const { container } = render(<Breadcrumb ariaLabel="Ruta" items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('PB-P2-029 · FilterBar y AppliedFilterChip', () => {
  beforeEach(cleanup);

  it('el chip tiene nombre accesible propio y es operable por teclado', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <AppliedFilterChip
        label="Estado: Publicada"
        removeLabel="Quitar filtro: Estado: Publicada"
        onRemove={onRemove}
      />,
    );
    const button = screen.getByRole('button', { name: 'Quitar filtro: Estado: Publicada' });
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('compone búsqueda, controles, chips y acciones sin conocer los filtros', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const onClear = vi.fn();
    const onRemove = vi.fn();
    render(
      <FilterBar
        ariaLabel="Filtros de eventos"
        search={<input aria-label="Buscar eventos" type="search" />}
        onSubmit={onSubmit}
        applyLabel="Aplicar"
        onClear={onClear}
        clearLabel="Limpiar"
        appliedLabel="Filtros aplicados"
        appliedFilters={[
          { key: 'a', label: 'Estado: Activo', removeLabel: 'Quitar: Estado Activo', onRemove },
        ]}
      >
        <label>
          Tipo
          <select />
        </label>
      </FilterBar>,
    );
    expect(screen.getByRole('form', { name: 'Filtros de eventos' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar eventos' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Filtros aplicados' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Quitar: Estado Activo' }));
    expect(onRemove).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(onClear).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('`collapsible` expone un disclosure con aria-expanded/aria-controls', async () => {
    const user = userEvent.setup();
    render(
      <FilterBar ariaLabel="Filtros" collapsible toggleLabel="Filtros">
        <span>control</span>
      </FilterBar>,
    );
    const toggle = screen.getByRole('button', { name: 'Filtros' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('PB-P2-029 · AppShell', () => {
  beforeEach(cleanup);

  it('compone skip link, topbar, sidebar, drawer y un único landmark principal', () => {
    render(
      <AppShell
        skipLink={<a href="#main-content">Saltar al contenido</a>}
        topBar={<TopBar brand={<span>EventFlow</span>} />}
        sidebar={<AppSidebar ariaLabel="Nav desktop" sections={SECTIONS} />}
        drawer={null}
        mainClassName="p-6"
      >
        <p>Contenido</p>
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main.className).toContain('p-6');
    expect(screen.getByRole('navigation', { name: 'Nav desktop' })).toBeInTheDocument();
  });

  it('el shell no provoca scroll horizontal de página', () => {
    const { container } = render(
      <AppShell topBar={<TopBar />}>
        <p>Contenido</p>
      </AppShell>,
    );
    expect((container.firstChild as HTMLElement).className).toContain('overflow-x-clip');
  });
});
