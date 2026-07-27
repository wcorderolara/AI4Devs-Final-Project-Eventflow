import type { ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * Badge — etiqueta compacta de metadata.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §14.
 *
 * - El texto visible es **obligatorio**: un badge nunca comunica sólo con color (UI-DEC-014).
 * - No es un control: si la pieza es interactiva, usar `Button`/`IconButton`.
 * - Para comunicar el **estado** de una entidad usar `StatusBadge`, no este componente.
 */
export type BadgeVariant = 'neutral' | 'role' | 'seed' | 'count';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Icono `lucide-react` decorativo (`aria-hidden`) delante del texto. */
  icon?: ReactNode;
  /** Texto visible ya traducido. */
  children: ReactNode;
  /**
   * Descripción contextual del badge, ya traducida e interpolada (p. ej. `3 tareas pendientes`).
   * Se lee **en lugar** del texto visible: el número queda `aria-hidden` para que el lector de
   * pantalla no anuncie «3 · 3 tareas pendientes». Pensado sobre todo para `variant="count"`,
   * cuyo dígito aislado no significa nada fuera de contexto.
   */
  srLabel?: string;
  className?: string;
  'data-testid'?: string;
}

const VARIANT: Record<BadgeVariant, string> = {
  neutral: 'border border-subtle bg-surface-subtle text-secondary',
  // Contexto de rol/workspace: acento violeta del sistema compartido. NO es un tema por rol
  // (UI-DEC-009): las tres roles usan exactamente esta variante.
  role: 'border border-subtle bg-surface-selected text-link',
  // Marcador discreto de datos de demo (UI Foundations §21 «seed / demo indicators»).
  seed: 'border border-feedback-info bg-feedback-info text-feedback-info',
  count: 'bg-action-primary text-action-primary-foreground',
};

const SIZE: Record<BadgeSize, string> = {
  sm: 'h-5 gap-1 px-2 text-caption',
  md: 'h-6 gap-1.5 px-2.5 text-body-sm',
};

export function Badge({
  variant = 'neutral',
  size = 'sm',
  icon,
  children,
  srLabel,
  className,
  'data-testid': testId,
}: BadgeProps): React.JSX.Element {
  return (
    <span
      data-testid={testId}
      className={cx(
        'inline-flex max-w-full items-center justify-center rounded-badge font-ui font-medium',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="inline-flex h-icon-sm w-icon-sm shrink-0">
          {icon}
        </span>
      ) : null}
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
      <span aria-hidden={srLabel ? 'true' : undefined} className="truncate">
        {children}
      </span>
    </span>
  );
}
