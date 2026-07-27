// PB-P2-029 — Componentes de feedback y estado del design system.
//
// Fuente normativa: docs/ux-ui/EventFlow-Component-Foundations.md §14 (Badge / StatusBadge),
// §27 (Alert, InlineMessage, Toast), §28 (Spinner, Skeleton), §29 (Empty, Error, PermissionDenied)
// y §25 (ProgressIndicator). Regla transversal (UI-DEC-014 / §37): el color NUNCA es la única
// señal — todo estado lleva texto visible.
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarX } from 'lucide-react';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Alert,
  Badge,
  EmptyState,
  ErrorState,
  InlineMessage,
  PermissionDeniedState,
  ProgressIndicator,
  Skeleton,
  Spinner,
  STATUS_BADGE_TONE,
  StatusBadge,
  TextLink,
  Toast,
  type AlertVariant,
  type StatusBadgeStatus,
} from '@/shared/design-system';

describe('PB-P2-029 · Badge', () => {
  beforeEach(cleanup);

  it('renderiza las 4 variantes con texto visible', () => {
    render(
      <>
        <Badge>Neutro</Badge>
        <Badge variant="role">Organizador</Badge>
        <Badge variant="seed">Demo</Badge>
        <Badge variant="count">7</Badge>
      </>,
    );
    for (const text of ['Neutro', 'Organizador', 'Demo', '7']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('no es un control: no expone rol de botón', () => {
    render(<Badge>Categoría</Badge>);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('PB-P2-029 · StatusBadge', () => {
  beforeEach(cleanup);

  const STATUSES: StatusBadgeStatus[] = [
    'neutral',
    'info',
    'success',
    'warning',
    'error',
    'draft',
    'active',
    'completed',
    'cancelled',
  ];

  it('todos los estados soportados muestran texto visible', () => {
    render(
      <>
        {STATUSES.map((status) => (
          <StatusBadge key={status} status={status} data-testid={`badge-${status}`}>
            {`Etiqueta ${status}`}
          </StatusBadge>
        ))}
      </>,
    );
    for (const status of STATUSES) {
      expect(screen.getByTestId(`badge-${status}`)).toHaveTextContent(`Etiqueta ${status}`);
    }
  });

  it('el mapeo estado de dominio → tono sigue Component Foundations §14', () => {
    expect(STATUS_BADGE_TONE.draft).toBe('neutral');
    expect(STATUS_BADGE_TONE.completed).toBe('neutral');
    expect(STATUS_BADGE_TONE.active).toBe('success');
    expect(STATUS_BADGE_TONE.cancelled).toBe('error');
  });

  it('el estado no depende sólo del color: hay glifo además del texto', () => {
    const { container } = render(<StatusBadge status="error">Cancelado</StatusBadge>);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('`showIcon={false}` conserva el texto', () => {
    const { container } = render(
      <StatusBadge status="success" showIcon={false}>
        Aprobado
      </StatusBadge>,
    );
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
  });

  it('sin `ariaLabel` no expone rol: el texto visible es el nombre accesible', () => {
    render(<StatusBadge status="warning">Pendiente</StatusBadge>);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('`ariaLabel` aporta el nombre accesible sin crear región viva (listado estático)', () => {
    render(
      <StatusBadge status="warning" ariaLabel="Estado del evento: Pendiente">
        Pendiente
      </StatusBadge>,
    );
    // PB-P2-031: `role="img"` etiqueta el badge sin que N filas se anuncien al renderizar.
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('img')).toHaveAccessibleName('Estado del evento: Pendiente');
  });

  it('`live` es el opt-in de región viva, igual que en Alert / InlineMessage / Toast', () => {
    render(
      <StatusBadge status="success" ariaLabel="Estado del evento: Activo" live>
        Activo
      </StatusBadge>,
    );
    expect(screen.getByRole('status')).toHaveAccessibleName('Estado del evento: Activo');
  });
});

describe('PB-P2-029 · Alert', () => {
  beforeEach(cleanup);

  const VARIANTS: AlertVariant[] = ['info', 'success', 'warning', 'error'];

  it.each(VARIANTS)('la variante %s muestra icono + título + descripción', (variant) => {
    const { container } = render(
      <Alert variant={variant} title={`Título ${variant}`} data-testid="alert">
        {`Cuerpo ${variant}`}
      </Alert>,
    );
    expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', variant);
    expect(screen.getByText(`Título ${variant}`)).toBeInTheDocument();
    expect(screen.getByText(`Cuerpo ${variant}`)).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('usa tokens de feedback, nunca lila ni coral', () => {
    render(
      <Alert variant="error" data-testid="alert">
        Error
      </Alert>,
    );
    const alert = screen.getByTestId('alert');
    expect(alert.className).toContain('bg-feedback-error');
    expect(alert.className).not.toMatch(/lilac|coral/);
  });

  it('sin `live` no crea región viva; con `live` anuncia según severidad', () => {
    const { rerender } = render(<Alert variant="error">Estático</Alert>);
    expect(screen.queryByRole('alert')).toBeNull();
    rerender(
      <Alert variant="error" live>
        Dinámico
      </Alert>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(
      <Alert variant="success" live>
        Guardado
      </Alert>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('el descarte tiene nombre accesible y dispara el callback', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <Alert variant="info" onDismiss={onDismiss} dismissLabel="Descartar aviso">
        Aviso
      </Alert>,
    );
    await user.click(screen.getByRole('button', { name: 'Descartar aviso' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('acepta una acción de recuperación', () => {
    render(
      <Alert variant="warning" action={<TextLink href="/organizer/events">Revisar</TextLink>}>
        Presupuesto excedido
      </Alert>,
    );
    expect(screen.getByRole('link', { name: 'Revisar' })).toBeInTheDocument();
  });
});

describe('PB-P2-029 · InlineMessage', () => {
  beforeEach(cleanup);

  it('`helper` es neutro y sin glifo semántico', () => {
    const { container } = render(<InlineMessage>Máximo 5 MB</InlineMessage>);
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('Máximo 5 MB')).toBeInTheDocument();
  });

  it.each(['info', 'success', 'warning', 'error'] as const)(
    'el tono %s añade glifo al texto',
    (tone) => {
      const { container } = render(<InlineMessage tone={tone}>{`Mensaje ${tone}`}</InlineMessage>);
      expect(container.querySelector('svg')).not.toBeNull();
      expect(screen.getByText(`Mensaje ${tone}`)).toBeInTheDocument();
    },
  );

  it('con `live` el error se anuncia y conserva el `id` para `aria-describedby`', () => {
    render(
      <InlineMessage tone="error" live id="range-error">
        Rango inválido
      </InlineMessage>,
    );
    const message = screen.getByRole('alert');
    expect(message).toHaveAttribute('id', 'range-error');
  });
});

describe('PB-P2-029 · Toast', () => {
  beforeEach(cleanup);

  it('los avisos no críticos se anuncian sin interrumpir', () => {
    render(
      <Toast variant="success" onDismiss={() => {}} dismissLabel="Cerrar" autoDismissMs={null}>
        Cambios guardados
      </Toast>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Cambios guardados');
  });

  it('el error usa `alert` para interrumpir', () => {
    render(
      <Toast variant="error" onDismiss={() => {}} dismissLabel="Cerrar" autoDismissMs={null}>
        No se pudo guardar
      </Toast>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar');
  });

  it('el descarte tiene nombre accesible', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <Toast onDismiss={onDismiss} dismissLabel="Cerrar notificación" autoDismissMs={null}>
        Mensaje
      </Toast>,
    );
    await user.click(screen.getByRole('button', { name: 'Cerrar notificación' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('se auto-descarta pasado el tiempo configurado', async () => {
    vi.useFakeTimers();
    try {
      const onDismiss = vi.fn();
      render(
        <Toast onDismiss={onDismiss} dismissLabel="Cerrar" autoDismissMs={4000}>
          Mensaje
        </Toast>,
      );
      expect(onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(4000);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('con `autoDismissMs = null` permanece hasta acción del usuario', () => {
    vi.useFakeTimers();
    try {
      const onDismiss = vi.fn();
      render(
        <Toast onDismiss={onDismiss} dismissLabel="Cerrar" autoDismissMs={null}>
          Mensaje
        </Toast>,
      );
      vi.advanceTimersByTime(60_000);
      expect(onDismiss).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('admite una acción opcional', () => {
    render(
      <Toast
        onDismiss={() => {}}
        dismissLabel="Cerrar"
        autoDismissMs={null}
        action={<TextLink href="/organizer/events">Deshacer</TextLink>}
      >
        Evento publicado
      </Toast>,
    );
    expect(screen.getByRole('link', { name: 'Deshacer' })).toBeInTheDocument();
  });
});

describe('PB-P2-029 · EmptyState', () => {
  beforeEach(cleanup);

  it('presenta título, descripción y ambas acciones', async () => {
    const user = userEvent.setup();
    const onPrimary = vi.fn();
    render(
      <EmptyState
        icon={<CalendarX />}
        title="Aún no hay eventos"
        description="Crea tu primer evento para empezar a planear."
        primaryAction={
          <button type="button" onClick={onPrimary}>
            Crear evento
          </button>
        }
        secondaryAction={<TextLink href="/organizer/events">Ver ejemplos</TextLink>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Aún no hay eventos' })).toBeInTheDocument();
    expect(screen.getByText('Crea tu primer evento para empezar a planear.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Crear evento' }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Ver ejemplos' })).toBeInTheDocument();
  });

  it('respeta el nivel semántico de heading que le indica la vista', () => {
    render(<EmptyState title="Sin usuarios que coincidan" headingLevel={2} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Sin usuarios que coincidan',
    );
  });

  it('sólo se anuncia cuando aparece dinámicamente', () => {
    const { rerender } = render(<EmptyState title="Sin ejecuciones de IA" />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<EmptyState title="Sin ejecuciones de IA" live />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('no incorpora copy propio: sin acciones no pinta ninguna', () => {
    render(<EmptyState title="Vacío" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('PB-P2-029 · ErrorState', () => {
  beforeEach(cleanup);

  it('se anuncia como error y ofrece reintento', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="No pudimos cargar tus eventos"
        description="Revisa tu conexión e inténtalo de nuevo."
        onRetry={onRetry}
        retryLabel="Reintentar"
      />,
    );
    const region = screen.getByRole('alert');
    expect(within(region).getByRole('heading')).toHaveTextContent('No pudimos cargar tus eventos');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('sin `onRetry` no aparece el botón', () => {
    render(<ErrorState title="Error" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('el correlation ID es metadata secundaria, no el mensaje principal', () => {
    render(
      <ErrorState
        title="Error"
        description="Mensaje humano"
        correlationId="req_abc123"
        correlationLabel="Referencia"
      />,
    );
    const heading = screen.getByRole('heading');
    expect(heading).not.toHaveTextContent('req_abc123');
    expect(screen.getByText('req_abc123')).toBeInTheDocument();
  });

  it('la API sólo admite texto: no hay forma de filtrar un stack trace', () => {
    render(<ErrorState title="Error" description="Mensaje humano" />);
    expect(screen.getByRole('alert').textContent).not.toMatch(/at .*\.tsx:|Error: |stack/i);
  });

  it('admite navegación segura alternativa', () => {
    render(
      <ErrorState
        title="Error"
        secondaryAction={<TextLink href="/organizer">Volver al panel</TextLink>}
      />,
    );
    expect(screen.getByRole('link', { name: 'Volver al panel' })).toHaveAttribute(
      'href',
      '/organizer',
    );
  });
});

describe('PB-P2-029 · PermissionDeniedState', () => {
  beforeEach(cleanup);

  it('ofrece una salida segura y no divulga el recurso restringido', () => {
    render(
      <PermissionDeniedState
        title="Acceso denegado"
        description="No tienes permiso para ver esta sección con tu cuenta actual."
        action={<TextLink href="/">Volver al inicio</TextLink>}
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Acceso denegado');
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });

  it('la referencia de soporte sólo aparece cuando se pasa con su etiqueta', () => {
    const { rerender } = render(<PermissionDeniedState title="Acceso denegado" />);
    expect(screen.queryByText(/req_/)).toBeNull();
    rerender(
      <PermissionDeniedState
        title="Acceso denegado"
        supportReference="req_xyz"
        supportLabel="Referencia"
      />,
    );
    expect(screen.getByText('req_xyz')).toBeInTheDocument();
  });
});

describe('PB-P2-029 · Spinner', () => {
  beforeEach(cleanup);

  it('con label expone `role="status"` y el nombre accesible', () => {
    render(<Spinner label="Cargando eventos" />);
    expect(screen.getByRole('status')).toHaveAccessibleName('Cargando eventos');
  });

  it('el label puede hacerse visible sin duplicar el anuncio', () => {
    render(<Spinner label="Cargando" labelHidden={false} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAccessibleName('Cargando');
    expect(status).toHaveTextContent('Cargando');
  });

  it('sin label es decorativo: no crea región viva', () => {
    render(<Spinner />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it.each(['sm', 'md', 'lg'] as const)('el tamaño %s usa el token de icono', (size) => {
    const { container } = render(<Spinner size={size} data-testid="spinner" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toContain(`h-icon-${size}`);
  });

  it('respeta `prefers-reduced-motion`', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('svg')?.getAttribute('class')).toContain(
      'motion-reduce:animate-none',
    );
  });
});

describe('PB-P2-029 · Skeleton', () => {
  beforeEach(cleanup);

  it.each(['text', 'card', 'listRow', 'tableRow', 'navItem'] as const)(
    'la variante %s se oculta al lector de pantalla',
    (variant) => {
      render(<Skeleton variant={variant} data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true');
    },
  );

  it('repite la forma tantas veces como se le pida', () => {
    const { container } = render(<Skeleton variant="tableRow" count={5} data-testid="skeleton" />);
    expect(container.querySelectorAll('[data-testid="skeleton"] > span')).toHaveLength(5);
  });

  it('desactiva el shimmer con movimiento reducido', () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton').innerHTML).toContain('motion-reduce:animate-none');
  });
});

describe('PB-P2-029 · ProgressIndicator', () => {
  beforeEach(cleanup);

  it('determinate expone valor, mínimo y máximo', () => {
    render(<ProgressIndicator label="Progreso del evento" value={60} valueText="60 %" max={100} />);
    const bar = screen.getByRole('progressbar', { name: 'Progreso del evento' });
    expect(bar).toHaveAttribute('aria-valuenow', '60');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuetext', '60 %');
  });

  it('el valor también es visible, no sólo la barra', () => {
    render(<ProgressIndicator label="Tareas" value={18} max={30} valueText="18 de 30 tareas" />);
    expect(screen.getByText('Tareas')).toBeInTheDocument();
    expect(screen.getByText('18 de 30 tareas')).toBeInTheDocument();
  });

  it('indeterminate no inventa porcentaje', () => {
    render(<ProgressIndicator label="Generando sugerencia" />);
    const bar = screen.getByRole('progressbar', { name: 'Generando sugerencia' });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar).toHaveAttribute('aria-busy', 'true');
  });

  it('acota el valor al rango declarado', () => {
    const { container } = render(<ProgressIndicator label="Carga" value={250} max={100} />);
    const fill = container.querySelector('[role="progressbar"] > span') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('soporta rangos que no empiezan en 0', () => {
    render(<ProgressIndicator label="Paso" value={3} min={1} max={5} valueText="Paso 3 de 5" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
  });
});

describe('PB-P2-029 · consumidores migrados', () => {
  beforeEach(cleanup);

  it('el estado vacío del presupuesto conserva sus deeplinks', async () => {
    const { EmptyBudgetState } = await import('@/features/budget/view/components/EmptyBudgetState');
    const { NextIntlClientProvider } = await import('next-intl');
    const messages = await import('@/messages/en/budget.json');
    render(
      <NextIntlClientProvider locale="en" messages={{ budget: messages.default }}>
        <EmptyBudgetState eventId="ev-9" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByTestId('budget-empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /suggest with ai/i })).toHaveAttribute(
      'href',
      '/organizer/events/ev-9/ai/budget',
    );
    expect(screen.getByRole('link', { name: /add manually/i })).toHaveAttribute(
      'href',
      '/organizer/events/ev-9/budget?add=1',
    );
  });

  it('el badge de moderación de vendors conserva testids y muestra el texto de estado', async () => {
    const { VendorStatusBadge } =
      await import('@/features/admin/vendors/components/VendorStatusBadge');
    const { NextIntlClientProvider } = await import('next-intl');
    const messages = await import('@/messages/en/admin.json');
    render(
      <NextIntlClientProvider locale="en" messages={{ admin: messages.default }}>
        <VendorStatusBadge status="pending" isHidden />
      </NextIntlClientProvider>,
    );
    expect(screen.getByTestId('admin-vendor-status-pending')).toHaveTextContent('Pending');
    expect(screen.getByTestId('admin-vendor-hidden-badge')).toHaveTextContent('Hidden');
  });
});

describe('PB-P2-029 · sin regresión de anuncios duplicados', () => {
  beforeEach(cleanup);

  it('un Alert estático y un Toast dinámico no compiten por la misma región viva', async () => {
    render(
      <>
        <Alert variant="error" title="No se pudo guardar">
          El error permanece visible en la página, no sólo en el toast (CMP-DEC-022).
        </Alert>
        <Toast variant="error" onDismiss={() => {}} dismissLabel="Cerrar" autoDismissMs={null}>
          Reintenta en unos segundos
        </Toast>
      </>,
    );
    // El Alert estático no crea región viva, así que sólo el toast interrumpe: un único `alert`.
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(1));
    expect(screen.getByText('No se pudo guardar')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Reintenta en unos segundos');
  });
});

// ---------------------------------------------------------------------------------------------
// PB-P2-030 — Navigation, Feedback & States. Estados y comportamientos que faltaban tras
// PB-P2-029, verificados contra el screen Stitch
// `projects/10889252267442839867/screens/19e34fc844be45a39f7e86e00ae2980c`
// («Component Design System — Navigation, Feedback & States»).
//
// Ningún componente se recrea: se extienden y normalizan los ya existentes.
// ---------------------------------------------------------------------------------------------

describe('PB-P2-030 · Badge · contexto accesible del contador', () => {
  beforeEach(cleanup);

  it('`srLabel` describe el contador y silencia el dígito aislado', () => {
    render(
      <Badge variant="count" srLabel="3 tareas pendientes" data-testid="count">
        3
      </Badge>,
    );
    const badge = screen.getByTestId('count');
    // Un «3» suelto no significa nada para el lector de pantalla; la descripción lo sustituye.
    expect(badge).toHaveTextContent('3 tareas pendientes');
    expect(badge.querySelector('[aria-hidden="true"]')).toHaveTextContent('3');
  });

  it('sin `srLabel` el texto visible sigue siendo el contenido anunciado', () => {
    render(<Badge data-testid="plain">Organizador</Badge>);
    const badge = screen.getByTestId('plain');
    expect(badge).toHaveTextContent('Organizador');
    expect(badge.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('cada variante compartida mapea a utilidades semánticas, nunca a paleta cruda', () => {
    render(
      <>
        <Badge data-testid="v-neutral">Metadata</Badge>
        <Badge variant="role" data-testid="v-role">
          Admin
        </Badge>
        <Badge variant="seed" data-testid="v-seed">
          SEED-492
        </Badge>
        <Badge variant="count" data-testid="v-count">
          42
        </Badge>
      </>,
    );
    expect(screen.getByTestId('v-neutral').className).toContain('bg-surface-subtle');
    expect(screen.getByTestId('v-role').className).toContain('bg-surface-selected');
    expect(screen.getByTestId('v-seed').className).toContain('bg-feedback-info');
    expect(screen.getByTestId('v-count').className).toContain('bg-action-primary');
    for (const id of ['v-neutral', 'v-role', 'v-seed', 'v-count']) {
      expect(screen.getByTestId(id).className).not.toMatch(/-(?:50|100|200|500|600|700|800)\b/);
      expect(screen.getByTestId(id).className).toContain('rounded-badge');
    }
  });
});

describe('PB-P2-030 · StatusBadge · mapeo a tokens semánticos', () => {
  beforeEach(cleanup);

  const TONE_CLASS = {
    neutral: 'bg-surface-subtle',
    info: 'bg-feedback-info',
    success: 'bg-feedback-success',
    warning: 'bg-feedback-warning',
    error: 'bg-feedback-error',
  } as const;

  it.each([
    ['draft', 'neutral'],
    ['active', 'success'],
    ['completed', 'neutral'],
    ['cancelled', 'error'],
    ['warning', 'warning'],
    ['info', 'info'],
  ] as const)('el estado %s consume los tokens del tono %s', (status, tone) => {
    render(
      <StatusBadge status={status} data-testid="badge">
        {`Etiqueta ${status}`}
      </StatusBadge>,
    );
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain(TONE_CLASS[tone]);
    // Stitch pinta `completed` en verde y usa hex crudos (`#dcfce7`, `#fef08a`, `#e0f2fe`);
    // la autoridad es Component Foundations §14, que lo asigna a neutral.
    expect(badge.className).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('cada estado de dominio conserva un glifo propio además del texto', () => {
    const { container: draft } = render(<StatusBadge status="draft">Borrador</StatusBadge>);
    const draftGlyph = draft.querySelector('svg')?.outerHTML;
    cleanup();
    const { container: cancelled } = render(
      <StatusBadge status="cancelled">Cancelado</StatusBadge>,
    );
    expect(cancelled.querySelector('svg')?.outerHTML).not.toBe(draftGlyph);
  });
});

describe('PB-P2-030 · Alert · reenvío de ref', () => {
  beforeEach(cleanup);

  it('expone el nodo para que un formulario pueda enfocar el resumen de errores', () => {
    function Harness(): React.JSX.Element {
      const ref = useRef<HTMLDivElement>(null);
      return (
        <>
          <button type="button" onClick={() => ref.current?.focus()}>
            Ir al error
          </button>
          <Alert ref={ref} variant="error" live tabIndex={-1} data-testid="alert">
            Revisa los campos marcados
          </Alert>
        </>
      );
    }
    render(<Harness />);
    screen.getByRole('button', { name: 'Ir al error' }).click();
    expect(screen.getByTestId('alert')).toHaveFocus();
  });
});

describe('PB-P2-030 · InlineMessage · identificador para `aria-describedby`', () => {
  beforeEach(cleanup);

  it('genera un id estable cuando el consumidor no lo aporta', () => {
    render(
      <InlineMessage tone="info" data-testid="msg">
        Se aplicará al guardar
      </InlineMessage>,
    );
    const id = screen.getByTestId('msg').getAttribute('id');
    expect(id).toBeTruthy();
    expect(id).not.toBe('');
  });

  it('el id generado sirve para asociar el mensaje a un control externo', () => {
    function Harness(): React.JSX.Element {
      const id = 'inline-desc';
      return (
        <>
          <input aria-label="Aforo" aria-describedby={id} />
          <InlineMessage id={id} tone="warning">
            Supera el aforo recomendado
          </InlineMessage>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('textbox', { name: 'Aforo' })).toHaveAccessibleDescription(
      'Supera el aforo recomendado',
    );
  });

  it('un mensaje traducido largo envuelve en lugar de recortarse', () => {
    const long =
      'Este mensaje contextual es deliberadamente extenso para comprobar que la traducción ' +
      'más larga de los cuatro locales soportados envuelve en varias líneas sin truncarse.';
    render(
      <InlineMessage tone="warning" data-testid="msg">
        {long}
      </InlineMessage>,
    );
    expect(screen.getByTestId('msg')).toHaveTextContent(long);
    expect(screen.getByTestId('msg').innerHTML).toContain('break-words');
    expect(screen.getByTestId('msg').innerHTML).not.toContain('truncate');
  });
});

describe('PB-P2-030 · EmptyState · variantes y ejemplos de uso', () => {
  beforeEach(cleanup);

  it('la variante compact reduce el espaciado sin perder título ni acción', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <EmptyState
        variant="compact"
        title="Sin cotizaciones"
        primaryAction={
          <button type="button" onClick={onCreate}>
            Solicitar
          </button>
        }
        data-testid="empty"
      />,
    );
    const empty = screen.getByTestId('empty');
    expect(empty.className).toContain('p-4');
    expect(screen.getByRole('heading', { name: 'Sin cotizaciones' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Solicitar' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('section y page conservan su escala mayor', () => {
    const { rerender } = render(
      <EmptyState variant="section" title="Sin datos" data-testid="empty" />,
    );
    expect(screen.getByTestId('empty').className).toContain('p-6');
    rerender(<EmptyState variant="page" title="Sin datos" data-testid="empty" />);
    expect(screen.getByTestId('empty').className).toContain('p-10');
  });

  it.each([
    ['No hay eventos', 'Aún no has creado ningún evento.'],
    ['Ningún usuario coincide con los filtros', 'Prueba a limpiar los filtros aplicados.'],
    ['Sin ejecuciones de IA', 'Todavía no has generado ninguna sugerencia.'],
  ])('el copy «%s» llega por props, no vive en el componente', (title, description) => {
    render(<EmptyState icon={<CalendarX />} title={title} description={description} />);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('no introduce dependencias de imagen ni ilustraciones', () => {
    const { container } = render(<EmptyState icon={<CalendarX />} title="Sin eventos" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('PB-P2-030 · ErrorState · mensajes multilínea y metadata técnica', () => {
  beforeEach(cleanup);

  it('conserva los saltos de línea de un mensaje localizado', () => {
    const multiline = 'No pudimos cargar tus eventos.\nRevisa tu conexión e inténtalo de nuevo.';
    render(<ErrorState title="Error" description={multiline} data-testid="error" />);
    const paragraph = screen.getByText(/No pudimos cargar tus eventos/);
    expect(paragraph.className).toContain('whitespace-pre-line');
    expect(paragraph.textContent).toBe(multiline);
  });

  it('la metadata técnica es texto secundario, nunca el mensaje principal', () => {
    render(
      <ErrorState
        title="No pudimos cargar la sección"
        description="Inténtalo de nuevo en unos segundos."
        correlationId="a8f9-4b2c-91e3"
        correlationLabel="Referencia"
        technicalDetails="Reintento 2 de 3"
        data-testid="error"
      />,
    );
    expect(screen.getByRole('heading')).toHaveTextContent('No pudimos cargar la sección');
    expect(screen.getByText('a8f9-4b2c-91e3')).toBeInTheDocument();
    expect(screen.getByText('Reintento 2 de 3').className).toContain('text-muted');
  });

  it('la API no admite un Error ni un payload: no puede filtrar detalle interno', () => {
    render(
      <ErrorState
        title="Error"
        description="Inténtalo de nuevo."
        technicalDetails="Reintento 2 de 3"
      />,
    );
    const text = screen.getByRole('alert').textContent ?? '';
    expect(text).not.toMatch(/TypeError|ECONNREFUSED|at .*\.tsx:|Bearer |sk-|prompt/i);
  });
});

describe('PB-P2-030 · PermissionDeniedState · salida secundaria', () => {
  beforeEach(cleanup);

  it('admite dos salidas seguras y ninguna revela el recurso restringido', () => {
    render(
      <PermissionDeniedState
        title="Acceso denegado"
        description="No tienes permiso para ver esta sección con tu cuenta actual."
        action={<TextLink href="/">Volver al inicio</TextLink>}
        secondaryAction={<TextLink href="/organizer">Ver mis eventos</TextLink>}
        data-testid="denied"
      />,
    );
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Ver mis eventos' })).toHaveAttribute(
      'href',
      '/organizer',
    );
    // Sin identificador del recurso ni pista sobre su existencia o sobre la regla incumplida.
    const text = screen.getByTestId('denied').textContent ?? '';
    expect(text).not.toMatch(/rol|scope|permission\.|policy|id=|administrador/i);
  });
});

describe('PB-P2-030 · Skeleton · variante avatar y semántica de la región', () => {
  beforeEach(cleanup);

  it('la variante avatar es circular y decorativa', () => {
    render(<Skeleton variant="avatar" data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveAttribute('data-variant', 'avatar');
    expect(skeleton.innerHTML).toContain('rounded-badge');
  });

  it.each(['text', 'avatar', 'card', 'listRow', 'tableRow', 'navItem'] as const)(
    'la variante %s no aporta texto al árbol de accesibilidad',
    (variant) => {
      render(<Skeleton variant={variant} data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton').textContent).toBe('');
    },
  );

  it('usa tamaños del sistema, no anchos arbitrarios en píxeles', () => {
    render(<Skeleton variant="avatar" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton').innerHTML).toContain('h-icon-lg');
    expect(screen.getByTestId('skeleton').innerHTML).not.toMatch(/w-\[\d+px\]|style="width/);
  });
});

describe('PB-P2-030 · ProgressIndicator · valores acotados', () => {
  beforeEach(cleanup);

  it('`aria-valuenow` nunca sale del rango declarado', () => {
    const { rerender } = render(<ProgressIndicator label="Carga" value={250} max={100} />);
    let bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    rerender(<ProgressIndicator label="Carga" value={-40} max={100} />);
    bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    const fill = bar.querySelector('span') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('un rango degenerado se trata como indeterminado en lugar de exponer datos inválidos', () => {
    render(<ProgressIndicator label="Procesando" value={5} min={10} max={10} />);
    const bar = screen.getByRole('progressbar', { name: 'Procesando' });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar).not.toHaveAttribute('aria-valuemin');
    expect(bar).toHaveAttribute('aria-busy', 'true');
  });

  it('la descripción se asocia a la barra y el indeterminado no simula porcentaje', () => {
    render(<ProgressIndicator label="Generando sugerencia" description="Puede tardar un minuto" />);
    const bar = screen.getByRole('progressbar', { name: 'Generando sugerencia' });
    expect(bar).toHaveAccessibleDescription('Puede tardar un minuto');
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('el porcentaje visible sólo aparece cuando el consumidor lo formatea', () => {
    render(<ProgressIndicator label="Progreso de subida" value={45} valueText="45 %" />);
    expect(screen.getByText('45 %')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '45 %');
  });
});
