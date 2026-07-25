import type { ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * EmptyState — ausencia de datos con contexto y salida clara.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §29.
 *
 * - Título + descripción + acción; **nunca** una pantalla vacía sin contexto.
 * - **No** contiene copy: cada superficie aporta el suyo desde `next-intl` (sin eventos,
 *   sin usuarios que coincidan con los filtros, sin ejecuciones de IA…).
 * - **No** muestra datos de ejemplo falsos (`Ejemplo: pedir catering`).
 * - Las acciones llegan como `ReactNode` (`Button`, `TextLink`) para no acoplar rutas ni handlers.
 */
export type EmptyStateVariant = 'section' | 'page';

export interface EmptyStateProps {
  /** Icono `lucide-react` decorativo. Opcional: el título es la señal primaria. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  variant?: EmptyStateVariant;
  /** Nivel semántico del título. Debe respetar la jerarquía de la página que lo monta. */
  headingLevel?: 2 | 3 | 4;
  /**
   * `true` cuando el estado vacío aparece tras aplicar filtros o refrescar datos: se anuncia con
   * `role="status"`. Si es el render inicial de la vista, dejarlo en `false`.
   */
  live?: boolean;
  className?: string;
  'data-testid'?: string;
}

const VARIANT: Record<EmptyStateVariant, string> = {
  section: 'p-6',
  page: 'p-10 sm:p-12',
};

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = 'section',
  headingLevel = 3,
  live = false,
  className,
  'data-testid': testId,
}: EmptyStateProps): React.JSX.Element {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';

  return (
    <div
      role={live ? 'status' : undefined}
      data-testid={testId}
      className={cx(
        'flex flex-col items-center rounded-card border border-dashed border-default bg-surface-subtle text-center',
        VARIANT[variant],
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-badge bg-surface text-muted"
        >
          {icon}
        </span>
      ) : null}
      <Heading className="font-heading text-h3 font-semibold text-primary">{title}</Heading>
      {description ? (
        <p className="mt-2 max-w-form text-balance font-body text-body-sm text-secondary">
          {description}
        </p>
      ) : null}
      {primaryAction || secondaryAction ? (
        <div className="mt-6 flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
