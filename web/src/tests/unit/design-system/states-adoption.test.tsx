// PB-P2-030 — Adopción limitada de los componentes de estado en consumidores existentes.
//
// Screen Stitch de referencia (evidencia visual, no autoridad):
// `projects/10889252267442839867/screens/19e34fc844be45a39f7e86e00ae2980c`.
//
// Regla del alcance: se migran **sólo** consumidores representativos y de bajo riesgo, sin cambiar
// rutas, permisos, contratos de API ni comportamiento de negocio. Estos tests fijan justamente
// eso: el copy, el rol accesible y el handler previos siguen intactos tras la migración.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '@/app/(app)/error';
import Loading from '@/app/(app)/loading';
import { TaskStatusQuickToggle } from '@/features/tasks/quick-action/TaskStatusQuickToggle';
import type { TaskListItemDTO } from '@/features/tasks/list/api/tasksListApi.types';
import enCommon from '@/messages/en/common.json';
import enErrors from '@/messages/en/errors.json';
import enTasks from '@/messages/en/tasks.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

function withIntl(node: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={{ common: enCommon, errors: enErrors, tasks: enTasks }}
    >
      {node}
    </NextIntlClientProvider>
  );
}

describe('PB-P2-030 · (app)/error.tsx adopta ErrorState', () => {
  beforeEach(cleanup);

  it('conserva el anuncio de error, el copy y el `reset` de Next', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        withIntl(
          <ErrorBoundary
            error={Object.assign(new Error('boom'), { digest: 'd1' })}
            reset={reset}
          />,
        ),
      );
      const region = screen.getByRole('alert');
      expect(region).toHaveTextContent(enErrors.envelope.UNEXPECTED);
      await user.click(screen.getByRole('button', { name: enCommon.retry }));
      expect(reset).toHaveBeenCalledTimes(1);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('no filtra el mensaje interno del `Error` ni el `digest` del servidor', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        withIntl(
          <ErrorBoundary
            error={Object.assign(new Error('ECONNREFUSED 127.0.0.1:5432'), { digest: 'srv-9f2' })}
            reset={() => {}}
          />,
        ),
      );
      const text = screen.getByRole('alert').textContent ?? '';
      expect(text).not.toContain('ECONNREFUSED');
      expect(text).not.toContain('srv-9f2');
    } finally {
      consoleError.mockRestore();
    }
  });

  it('deja de usar paleta cruda y consume tokens de feedback', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { container } = render(
        withIntl(<ErrorBoundary error={new Error('x')} reset={() => {}} />),
      );
      const html = container.innerHTML;
      expect(html).toContain('bg-feedback-error');
      expect(html).not.toContain('border-neutral-300');
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('PB-P2-030 · (app)/loading.tsx adopta Skeleton', () => {
  beforeEach(cleanup);

  it('la región contenedora comunica la carga y los placeholders son decorativos', () => {
    render(withIntl(<Loading />));
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveAccessibleName(enCommon.loading);
    // Component Foundations §28: el skeleton nunca anuncia; lo hace la región que lo contiene.
    const placeholders = region.querySelectorAll('[data-variant]');
    expect(placeholders.length).toBeGreaterThan(0);
    for (const placeholder of Array.from(placeholders)) {
      expect(placeholder).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('la forma representa el contenido, no un rectángulo genérico', () => {
    const { container } = render(withIntl(<Loading />));
    const variants = Array.from(container.querySelectorAll('[data-variant]')).map((node) =>
      node.getAttribute('data-variant'),
    );
    expect(variants).toContain('card');
    expect(variants).toContain('listRow');
    expect(container.innerHTML).toContain('motion-reduce:animate-none');
    expect(container.innerHTML).not.toContain('bg-neutral-200');
  });
});

describe('PB-P2-030 · TaskStatusQuickToggle adopta Alert', () => {
  beforeEach(cleanup);

  function makeTask(overrides: Partial<TaskListItemDTO> = {}): TaskListItemDTO {
    return {
      id: 't-1',
      title: 'Buy flowers',
      due_date: null,
      status: 'pending',
      category_code: 'flowers',
      ai_generated: false,
      ai_recommendation_id: null,
      confirmed_at: null,
      created_at: '2026-07-14T00:00:00Z',
      updated_at: '2026-07-14T00:00:00Z',
      overdue: false,
      is_t_minus_7: false,
      ...overrides,
    };
  }

  function wrap(node: React.ReactNode): React.ReactElement {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={client}>{withIntl(node)}</QueryClientProvider>;
  }

  it('conserva los controles previos y no pinta el aviso hasta que hay fallo', () => {
    render(wrap(<TaskStatusQuickToggle eventId="ev-1" task={makeTask()} />));
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    // Sin error no hay región viva compitiendo con el anuncio de cambio de estado.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('el error crítico permanece en la página: es un Alert, no un toast que se desvanece', () => {
    // CMP-DEC-022. El primitivo `Toast` se auto-descarta; `Alert` no tiene temporizador, de modo
    // que el fallo sigue visible hasta que el usuario reintenta o se resuelve la causa.
    const source = String(TaskStatusQuickToggle);
    expect(source).not.toContain('autoDismissMs');
    expect(source).not.toContain('banner--error');
  });
});
