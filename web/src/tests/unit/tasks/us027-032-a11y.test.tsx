// US-027/028/029/030/032 — QA-005/QA-004/QA-006 A11Y (jest-axe) consolidados de los componentes
// FE del stack de tareas. Cubre lo declarado como Not Run en los execution records (jest-axe no
// wired en el pipeline FE). Componentes chequean role, aria-modal, aria-label, focus visible.
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { EmptyChecklistState } from '@/features/tasks/list/components/EmptyChecklistState';
import { Pagination } from '@/features/tasks/list/components/Pagination';
import { CreateTaskDialog } from '@/features/tasks/create/components/CreateTaskDialog';
import { DeleteTaskDialog } from '@/features/tasks/mutate/components/DeleteTaskDialog';

import enTasks from '@/messages/en/tasks.json';
import enCommon from '@/messages/en/common.json';
import enErrors from '@/messages/en/errors.json';
import enValidation from '@/messages/en/validation.json';

expect.extend(toHaveNoViolations);

// Next `useRouter` mock (Pagination usa el pathname).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/organizer/events/ev-1/tasks',
  useSearchParams: () => new URLSearchParams(),
}));

const messages = {
  tasks: enTasks,
  common: enCommon,
  errors: enErrors,
  validation: enValidation,
};

function wrap(node: React.ReactNode): React.ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {node}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('US-027 QA-005 — A11Y de EmptyChecklistState + Pagination', () => {
  it('EmptyChecklistState sin violaciones axe', async () => {
    const { container } = render(wrap(<EmptyChecklistState eventId="ev-1" />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Pagination sin violaciones axe (multi-page)', async () => {
    const { container } = render(wrap(<Pagination page={2} totalPages={5} />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-028 QA-005 — A11Y de CreateTaskDialog', () => {
  it('sin violaciones axe', async () => {
    const { container } = render(
      wrap(<CreateTaskDialog eventId="ev-1" isOpen onClose={vi.fn()} />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-029 QA-005 — A11Y de DeleteTaskDialog', () => {
  it('sin violaciones axe', async () => {
    const { container } = render(
      wrap(<DeleteTaskDialog eventId="ev-1" taskId="t-1" isOpen onClose={vi.fn()} />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
