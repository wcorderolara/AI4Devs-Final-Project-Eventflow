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
 * - **Sin ilustraciones ni imágenes**: el visual opcional es un glifo Lucide, sin dependencias
 *   de assets (Component Foundations §29 admite «icono grande» como visual).
 */
export type EmptyStateVariant = 'compact' | 'section' | 'page';

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
  // `compact` cabe dentro de una card, una celda o un panel lateral sin dominar la vista.
  compact: 'p-4',
  section: 'p-6',
  page: 'p-10 sm:p-12',
};

/** El título baja de escala en `compact` para no competir con el heading de la card que lo aloja. */
const TITLE_SIZE: Record<EmptyStateVariant, string> = {
  compact: 'text-body-md',
  section: 'text-h3',
  page: 'text-h3',
};

const ICON_BOX: Record<EmptyStateVariant, string> = {
  compact: 'mb-2 h-8 w-8',
  section: 'mb-4 h-12 w-12',
  page: 'mb-4 h-12 w-12',
};

const ACTIONS_SPACING: Record<EmptyStateVariant, string> = {
  compact: 'mt-3',
  section: 'mt-6',
  page: 'mt-6',
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
          className={cx(
            'inline-flex items-center justify-center rounded-badge bg-surface text-muted',
            ICON_BOX[variant],
          )}
        >
          {icon}
        </span>
      ) : null}
      <Heading className={cx('font-heading font-semibold text-primary', TITLE_SIZE[variant])}>
        {title}
      </Heading>
      {description ? (
        <p className="mt-2 max-w-form text-balance font-body text-body-sm text-secondary">
          {description}
        </p>
      ) : null}
      {primaryAction || secondaryAction ? (
        <div
          className={cx(
            'flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center',
            ACTIONS_SPACING[variant],
          )}
        >
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
