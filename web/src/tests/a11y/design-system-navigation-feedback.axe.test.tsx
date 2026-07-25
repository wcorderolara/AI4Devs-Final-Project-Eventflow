// PB-P2-029 — Auditoría axe-core del catálogo de navegación y feedback.
//
// Umbral del gate (US-131 / OPS-001): 0 violaciones `critical`. Aquí se endurece a **0
// violaciones de cualquier severidad** para el catálogo propio, igual que hizo
// `design-system-actions-forms.axe.test.tsx` en PB-P2-028.
import { Calendar, CalendarX, LayoutDashboard, Store } from 'lucide-react';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Alert,
  AppShell,
  AppSidebar,
  AppliedFilterChip,
  Badge,
  Breadcrumb,
  EmptyState,
  ErrorState,
  FilterBar,
  InlineMessage,
  LanguageSelector,
  MobileNavigationDrawer,
  MobileNavigationTrigger,
  NotificationButton,
  PermissionDeniedState,
  ProgressIndicator,
  Skeleton,
  Spinner,
  StatusBadge,
  TextLink,
  Toast,
  TopBar,
  UserMenu,
  type NavigationSection,
} from '@/shared/design-system';
import { auditA11y, formatViolations } from './helpers/axe';

const SECTIONS: NavigationSection[] = [
  {
    id: 'main',
    label: 'Principal',
    items: [
      { href: '/organizer', label: 'Panel', icon: <LayoutDashboard />, active: true },
      {
        href: '/organizer/events',
        label: 'Eventos',
        icon: <Calendar />,
        badge: { count: 4, label: '4 eventos nuevos' },
      },
    ],
  },
  {
    id: 'resources',
    label: 'Recursos',
    items: [{ href: '/organizer/vendors', label: 'Proveedores', icon: <Store /> }],
  },
];

const LOCALES = [
  { value: 'es-LATAM', label: 'Español (LATAM)', short: 'es-LATAM' },
  { value: 'en', label: 'English', short: 'en' },
];

function NavigationCatalog(): React.JSX.Element {
  return (
    <AppShell
      skipLink={<a href="#main-content">Saltar al contenido</a>}
      topBar={
        <TopBar
          menuTrigger={
            <MobileNavigationTrigger label="Abrir menú" isOpen={false} onOpen={() => {}} />
          }
          brand={<span>EventFlow</span>}
          title="Panel"
          breadcrumb={
            <Breadcrumb
              ariaLabel="Ruta de navegación"
              items={[
                { label: 'Inicio', href: '/' },
                { label: 'Eventos', href: '/organizer/events' },
                { label: 'Gala Anual' },
              ]}
            />
          }
          actions={
            <>
              <NotificationButton label="Notificaciones, 4 sin leer" count={4} />
              <LanguageSelector
                label="Cambiar idioma"
                value="es-LATAM"
                options={LOCALES}
                onChange={() => {}}
              />
              <UserMenu
                triggerLabel="Menú de usuario"
                name="Ana Pérez"
                email="ana@eventflow.com"
                roleLabel="Organizador"
                items={[
                  { key: 'profile', label: 'Mi perfil', href: '/organizer/profile' },
                  { key: 'logout', label: 'Cerrar sesión', onSelect: () => {} },
                ]}
              />
            </>
          }
        />
      }
      sidebar={
        <AppSidebar
          ariaLabel="Navegación de organizador"
          sections={SECTIONS}
          header={<Badge variant="role">Espacio de organizador</Badge>}
        />
      }
      mainClassName="p-6"
    >
      <h1>Panel del organizador</h1>
      <FilterBar
        ariaLabel="Filtros de eventos"
        applyLabel="Aplicar"
        onClear={() => {}}
        clearLabel="Limpiar"
        appliedLabel="Filtros aplicados"
        appliedFilters={[
          {
            key: 'estado',
            label: 'Estado: Activo',
            removeLabel: 'Quitar filtro: Estado Activo',
            onRemove: () => {},
          },
        ]}
      >
        <label htmlFor="tipo">
          Tipo de evento
          <select id="tipo">
            <option>Boda</option>
          </select>
        </label>
      </FilterBar>
      <AppliedFilterChip
        label="Proveedor: Catering Sol"
        removeLabel="Quitar filtro: Proveedor Catering Sol"
        onRemove={() => {}}
      />
    </AppShell>
  );
}

function FeedbackCatalog(): React.JSX.Element {
  return (
    <main>
      <h1>Catálogo de feedback</h1>
      <Badge>Boda</Badge>
      <StatusBadge status="draft">Borrador</StatusBadge>
      <StatusBadge status="active">Activo</StatusBadge>
      <StatusBadge status="completed">Completado</StatusBadge>
      <StatusBadge status="cancelled">Cancelado</StatusBadge>
      <Alert variant="info" title="Información">
        El evento se guardó como borrador.
      </Alert>
      <Alert variant="success" title="Listo">
        Cotización enviada.
      </Alert>
      <Alert variant="warning" title="Atención">
        El monto comprometido supera al planificado.
      </Alert>
      <Alert
        variant="error"
        title="No se pudo guardar"
        onDismiss={() => {}}
        dismissLabel="Descartar aviso"
        action={<TextLink href="/organizer/events">Reintentar</TextLink>}
      >
        Revisa tu conexión.
      </Alert>
      <InlineMessage tone="warning">Quedan 3 días para responder.</InlineMessage>
      <Toast
        variant="success"
        onDismiss={() => {}}
        dismissLabel="Cerrar notificación"
        autoDismissMs={null}
      >
        Evento publicado.
      </Toast>
      <EmptyState
        icon={<CalendarX />}
        title="Aún no hay eventos"
        description="Crea tu primer evento para empezar a planear."
        primaryAction={<TextLink href="/organizer/events/new">Crear evento</TextLink>}
        headingLevel={2}
      />
      <ErrorState
        title="No pudimos cargar tus eventos"
        description="Revisa tu conexión e inténtalo de nuevo."
        onRetry={() => {}}
        retryLabel="Reintentar"
        correlationId="req_abc123"
        correlationLabel="Referencia"
        headingLevel={2}
      />
      <PermissionDeniedState
        title="Acceso denegado"
        description="No tienes permiso para ver esta sección con tu cuenta actual."
        action={<TextLink href="/">Volver al inicio</TextLink>}
        headingLevel={2}
      />
      <Spinner label="Cargando eventos" />
      <Skeleton variant="card" />
      <Skeleton variant="tableRow" count={3} />
      <ProgressIndicator label="Progreso del evento" value={60} valueText="60 %" />
      <ProgressIndicator label="Generando sugerencia" />
    </main>
  );
}

describe('PB-P2-029 · axe · navegación', () => {
  it('shell completo (topbar, sidebar, breadcrumb, filtros) sin violaciones', async () => {
    const { container } = render(<NavigationCatalog />);
    const { critical, otherViolations } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
  });

  it('menú de usuario abierto sin violaciones', async () => {
    const user = userEvent.setup();
    const { container } = render(<NavigationCatalog />);
    await user.click(screen.getByRole('button', { name: /Menú de usuario/ }));
    await screen.findByRole('menu');
    const { critical, otherViolations } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
  });

  it('drawer mobile abierto sin violaciones', async () => {
    const user = userEvent.setup();

    function Harness(): React.JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <MobileNavigationTrigger
            label="Abrir menú"
            isOpen={open}
            onOpen={() => setOpen(true)}
            controls="axe-drawer"
          />
          <MobileNavigationDrawer
            open={open}
            onClose={() => setOpen(false)}
            ariaLabel="Navegación principal"
            title="EventFlow"
            closeLabel="Cerrar menú"
            sections={SECTIONS}
            panelId="axe-drawer"
            footer={<TextLink href="/login">Cerrar sesión</TextLink>}
          />
        </div>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const dialog = await screen.findByRole('dialog');
    const { critical, otherViolations } = await auditA11y(dialog);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
  });
});

describe('PB-P2-029 · axe · feedback', () => {
  it('catálogo de feedback y estados sin violaciones', async () => {
    const { container } = render(<FeedbackCatalog />);
    const { critical, otherViolations } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
  });

  it('todo control del catálogo tiene nombre accesible', () => {
    render(
      <>
        <NavigationCatalog />
        <FeedbackCatalog />
      </>,
    );
    for (const control of [...screen.getAllByRole('button'), ...screen.getAllByRole('link')]) {
      expect(
        (control.textContent ?? '').trim().length > 0 ||
          (control.getAttribute('aria-label') ?? '').length > 0 ||
          (control.getAttribute('aria-labelledby') ?? '').length > 0,
        `control sin nombre accesible: ${control.outerHTML.slice(0, 120)}`,
      ).toBe(true);
    }
  });
});
