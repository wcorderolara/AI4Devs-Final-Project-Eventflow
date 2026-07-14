// US-032 (PB-P1-019 / QA-006 subset) — Unit tests para `TaskRangeFilter`.
// Cubre: aria-pressed correcto por defecto y por URL, escritura URL vía router.replace con
// `scroll:false` y reset de `page`, navegación por teclado (ArrowRight/Home/End), y el hecho
// de que default (`all`) no se serializa en la URL para mantenerla limpia.
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TaskRangeFilter } from '@/features/tasks/list/components/TaskRangeFilter';

const routerReplace = vi.fn();
const searchState = { params: new URLSearchParams() };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace }),
  useSearchParams: () => searchState.params,
}));

const messages = {
  checklist: {
    rangeFilter: {
      groupLabel: 'Filtro temporal',
      options: {
        overdue: { short: 'V', label: 'Vencidas', tooltip: 'Tareas vencidas' },
        '7d': { short: '7d', label: 'Próx. 7 días', tooltip: '7 días' },
        '30d': { short: '30d', label: 'Próx. 30 días', tooltip: '30 días' },
        all: { short: 'Todas', label: 'Todas', tooltip: 'Todas' },
      },
    },
  },
};

function renderFilter(): void {
  render(
    <NextIntlClientProvider locale="es-LATAM" messages={messages}>
      <TaskRangeFilter />
    </NextIntlClientProvider>,
  );
}

describe('<TaskRangeFilter>', () => {
  beforeEach(() => {
    routerReplace.mockReset();
    searchState.params = new URLSearchParams();
  });

  it('AC-07: sin range en URL → "Todas" está activo (aria-pressed=true)', () => {
    renderFilter();
    const allBtn = screen.getByRole('button', { name: 'Todas' });
    expect(allBtn).toHaveAttribute('aria-pressed', 'true');
    const overdueBtn = screen.getByRole('button', { name: 'Vencidas' });
    expect(overdueBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('AC-07: range=7d en URL → toggle "Próx. 7 días" activo', () => {
    searchState.params = new URLSearchParams('range=7d');
    renderFilter();
    expect(screen.getByRole('button', { name: 'Próx. 7 días' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('range inválido en URL → refleja default "Todas" (mirror de EC-01 backend)', () => {
    searchState.params = new URLSearchParams('range=foo');
    renderFilter();
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('AC-07: click en "Vencidas" → router.replace con range=overdue, sin page, scroll:false', () => {
    searchState.params = new URLSearchParams('page=3&status=pending');
    renderFilter();
    fireEvent.click(screen.getByRole('button', { name: 'Vencidas' }));
    expect(routerReplace).toHaveBeenCalledOnce();
    const [href, opts] = routerReplace.mock.calls[0] as [string, { scroll: boolean }];
    expect(href).toContain('range=overdue');
    expect(href).toContain('status=pending');
    expect(href).not.toContain('page=');
    expect(opts).toEqual({ scroll: false });
  });

  it('click en "Todas" desde otro toggle → limpia range de la URL', () => {
    searchState.params = new URLSearchParams('range=overdue&page=2');
    renderFilter();
    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    const [href] = routerReplace.mock.calls[0] as [string];
    expect(href).not.toContain('range=');
    expect(href).not.toContain('page=');
  });

  it('A11Y-01: ArrowRight desde "Todas" (activo) avanza a "Vencidas" (roving tabindex)', () => {
    renderFilter();
    const allBtn = screen.getByRole('button', { name: 'Todas' });
    fireEvent.keyDown(allBtn, { key: 'ArrowRight' });
    expect(routerReplace).toHaveBeenCalled();
    const [href] = routerReplace.mock.calls[0] as [string];
    // Índice 0 = overdue; ArrowRight desde all (índice 3) hace wrap a 0.
    expect(href).toContain('range=overdue');
  });

  it('A11Y-01: Home / End saltan al primero y último', () => {
    renderFilter();
    const allBtn = screen.getByRole('button', { name: 'Todas' });
    fireEvent.keyDown(allBtn, { key: 'Home' });
    expect((routerReplace.mock.calls[0] as [string])[0]).toContain('range=overdue');
    routerReplace.mockReset();
    fireEvent.keyDown(allBtn, { key: 'End' });
    // Índice 3 = all → limpia range.
    const [href] = routerReplace.mock.calls[0] as [string];
    expect(href).not.toContain('range=');
  });

  it('cada toggle expone aria-pressed y solo el activo tiene tabIndex=0', () => {
    searchState.params = new URLSearchParams('range=30d');
    renderFilter();
    const active = screen.getByRole('button', { name: 'Próx. 30 días' });
    expect(active).toHaveAttribute('tabIndex', '0');
    const inactive = screen.getByRole('button', { name: 'Vencidas' });
    expect(inactive).toHaveAttribute('tabIndex', '-1');
  });
});
