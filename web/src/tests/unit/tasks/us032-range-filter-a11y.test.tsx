// US-032 QA-006 — A11Y formal (jest-axe) del TaskRangeFilter.
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { TaskRangeFilter } from '@/features/tasks/list/components/TaskRangeFilter';
import enTasks from '@/messages/en/tasks.json';

expect.extend(toHaveNoViolations);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/organizer/events/ev-1/tasks',
  useSearchParams: () => new URLSearchParams(),
}));

describe('US-032 QA-006 — A11Y de TaskRangeFilter (jest-axe formal)', () => {
  it('sin violaciones axe', async () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={{ tasks: enTasks }}>
        <TaskRangeFilter />
      </NextIntlClientProvider>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
