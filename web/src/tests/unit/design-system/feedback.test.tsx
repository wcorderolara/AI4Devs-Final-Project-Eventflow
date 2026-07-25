// PB-P2-029 — Componentes de feedback y estado del design system.
//
// Fuente normativa: docs/ux-ui/EventFlow-Component-Foundations.md §14 (Badge / StatusBadge),
// §27 (Alert, InlineMessage, Toast), §28 (Spinner, Skeleton), §29 (Empty, Error, PermissionDenied)
// y §25 (ProgressIndicator). Regla transversal (UI-DEC-014 / §37): el color NUNCA es la única
// señal — todo estado lleva texto visible.
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarX } from 'lucide-react';
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

  it('sólo se anuncia como status cuando se pasa `ariaLabel`', () => {
    const { rerender } = render(<StatusBadge status="warning">Pendiente</StatusBadge>);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(
      <StatusBadge status="warning" ariaLabel="Estado del evento: Pendiente">
        Pendiente
      </StatusBadge>,
    );
    expect(screen.getByRole('status')).toHaveAccessibleName('Estado del evento: Pendiente');
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
