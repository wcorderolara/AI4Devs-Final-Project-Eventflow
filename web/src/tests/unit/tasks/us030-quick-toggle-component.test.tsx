// US-030 QA-002/003/004/006 — Component tests + A11Y del TaskStatusQuickToggle.
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { TaskStatusQuickToggle } from '@/features/tasks/quick-action/TaskStatusQuickToggle';
import type { TaskListItemDTO } from '@/features/tasks/list/api/tasksListApi.types';
import enTasks from '@/messages/en/tasks.json';

expect.extend(toHaveNoViolations);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

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
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={{ tasks: enTasks }}>
        {node}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('US-030 QA-002/006 — <TaskStatusQuickToggle>', () => {
  it('QA-002 happy path: renderiza role=checkbox + aria-checked según status', () => {
    render(wrap(<TaskStatusQuickToggle eventId="ev-1" task={makeTask({ status: 'pending' })} />));
    const el = screen.getByRole('checkbox');
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('QA-002: aria-checked=true cuando status=done', () => {
    render(wrap(<TaskStatusQuickToggle eventId="ev-1" task={makeTask({ status: 'done' })} />));
    const el = screen.getByRole('checkbox');
    expect(el).toHaveAttribute('aria-checked', 'true');
  });

  it('QA-004: evento en cancelled/completed → aria-disabled o disabled', () => {
    render(wrap(<TaskStatusQuickToggle eventId="ev-1" task={makeTask()} eventStatus="cancelled" />));
    const el = screen.getByRole('checkbox');
    // El componente deshabilita cuando el evento no es mutable.
    expect(
      el.hasAttribute('aria-disabled') || el.hasAttribute('disabled'),
    ).toBe(true);
  });

  it('QA-006 A11Y: sin violaciones axe (pending)', async () => {
    const { container } = render(
      wrap(<TaskStatusQuickToggle eventId="ev-1" task={makeTask({ status: 'pending' })} />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('QA-006 A11Y: sin violaciones axe (done)', async () => {
    const { container } = render(
      wrap(<TaskStatusQuickToggle eventId="ev-1" task={makeTask({ status: 'done' })} />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
