'use client';

import { X } from 'lucide-react';
import { cx } from '../internal/cx';

/**
 * AppliedFilterChip — filtro activo, removible.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §24 (`FilterBar` → applied
 * filters summary) y §37 (nombre accesible + touch target).
 *
 * - El chip es un `<span>`; el único elemento interactivo es el botón de quitar. Así el chip no
 *   compite por el foco con su propia acción.
 * - `removeLabel` es el nombre accesible completo ya traducido e interpolado
 *   (p. ej. `Quitar filtro: Estado — Publicada`), para que el lector de pantalla sepa **qué** quita.
 * - `radius.badge` (pill). Sin colores decorativos: el chip es metadata, no un estado semántico.
 */
export interface AppliedFilterChipProps {
  /** Texto visible del filtro aplicado, ya traducido. */
  label: string;
  onRemove: () => void;
  /** Nombre accesible del control de quitar, ya traducido e interpolado. */
  removeLabel: string;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function AppliedFilterChip({
  label,
  onRemove,
  removeLabel,
  disabled = false,
  className,
  'data-testid': testId,
}: AppliedFilterChipProps): React.JSX.Element {
  return (
    <span
      data-testid={testId}
      className={cx(
        'inline-flex max-w-full items-center gap-1 rounded-badge border border-subtle bg-surface-subtle',
        'py-0.5 pl-3 pr-0.5 font-ui text-body-sm text-secondary',
        className,
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={removeLabel}
        className="focus-ring hit-area inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-badge text-secondary transition-colors duration-fast ease-standard hover:bg-action-ghost-hover disabled:cursor-not-allowed disabled:opacity-disabled"
      >
        <X aria-hidden="true" className="h-icon-sm w-icon-sm" />
      </button>
    </span>
  );
}
