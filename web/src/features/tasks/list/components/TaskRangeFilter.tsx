'use client';

// US-032 (PB-P1-019 / FE-001) — Segmented control accesible WCAG AA para el filtro temporal.
//
// Comportamiento:
//   * URL-driven: el toggle activo se lee de `?range=…` y se escribe con `router.replace`
//     (`scroll:false` — no reingresa al top de la lista).
//   * Cambio de toggle resetea `page=1` para no dejar al usuario en una página vacía tras
//     estrechar el filtro (mismo patrón que `TaskFilters`).
//   * Un solo toggle activo a la vez (mutual exclusion inherente al enum).
//   * Cuando el valor URL no está en el enum, se muestra "Todas" como activo (mirroring del
//     default server-side; el backend lo normaliza tolerantemente vía EC-01).
//
// Accesibilidad (A11Y-01..04):
//   * `<div role="group" aria-label="…">` contenedor.
//   * Cada toggle es `<button type="button" aria-pressed={isActive}>` — expone estado a NVDA/VoiceOver.
//   * Navegación por teclado: `ArrowLeft` / `ArrowRight` mueven foco y activan el toggle (roving);
//     `Home` / `End` saltan al primero/último; `Space`/`Enter` activa el toggle enfocado.
//   * Outline visible por design tokens (no se resetea el nativo).
//   * `prefers-reduced-motion` se respeta desde CSS global (no aplica transición aquí).
import { useCallback, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_TASK_LIST_RANGE,
  TASK_LIST_RANGES,
  type TaskListRange,
} from '../api/tasksListApi.types';

function normalizeRange(raw: string | null): TaskListRange {
  return (TASK_LIST_RANGES as readonly string[]).includes(raw ?? '')
    ? (raw as TaskListRange)
    : DEFAULT_TASK_LIST_RANGE;
}

export function TaskRangeFilter(): JSX.Element {
  const router = useRouter();
  const search = useSearchParams();
  const t = useTranslations('checklist.rangeFilter');
  const active = normalizeRange(search.get('range'));
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const setRange = useCallback(
    (value: TaskListRange): void => {
      const params = new URLSearchParams(search.toString());
      // Default → clave ausente; explícito → clave presente. Mantiene URLs compartibles limpias.
      if (value === DEFAULT_TASK_LIST_RANGE) params.delete('range');
      else params.set('range', value);
      params.delete('page');
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, search],
  );

  const onKeyDown = useCallback(
    (index: number) => (event: KeyboardEvent<HTMLButtonElement>): void => {
      let nextIndex = index;
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (index + 1) % TASK_LIST_RANGES.length;
          break;
        case 'ArrowLeft':
          nextIndex = (index - 1 + TASK_LIST_RANGES.length) % TASK_LIST_RANGES.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = TASK_LIST_RANGES.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      const target = buttonRefs.current[nextIndex];
      target?.focus();
      setRange(TASK_LIST_RANGES[nextIndex]!);
    },
    [setRange],
  );

  return (
    <div
      role="group"
      aria-label={t('groupLabel')}
      className="task-range-filter"
      data-testid="task-range-filter"
    >
      {TASK_LIST_RANGES.map((value, index) => {
        const isActive = value === active;
        return (
          <button
            key={value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            aria-pressed={isActive}
            className={`task-range-filter__toggle${isActive ? ' is-active' : ''}`}
            onClick={(): void => setRange(value)}
            onKeyDown={onKeyDown(index)}
            title={t(`options.${value}.tooltip`)}
            tabIndex={isActive ? 0 : -1}
          >
            <span aria-hidden="true" className="task-range-filter__short">
              {t(`options.${value}.short`)}
            </span>
            <span className="task-range-filter__long">
              {t(`options.${value}.label`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
