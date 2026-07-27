import { Spinner as Glyph } from '../internal/Spinner';
import { cx } from '../internal/cx';

/**
 * Spinner — indicador de carga local.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §28.
 *
 * - Reutiliza el glifo interno del design system (`internal/Spinner`), que ya respeta
 *   `prefers-reduced-motion` vía `motion-reduce:animate-none`.
 * - Con `label` se envuelve en `role="status"` y el texto queda disponible para el lector de
 *   pantalla (visible u oculto según `labelHidden`). Sin `label` el spinner es **decorativo** y
 *   el estado accesible lo aporta quien lo monta (p. ej. `aria-busy` en un `Button`).
 * - Para la carga de una vista completa preferir `Skeleton`: comunica la forma del contenido.
 */
export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Texto de carga ya traducido (p. ej. `Cargando…`). Activa `role="status"`. */
  label?: string;
  /** `false` muestra el label junto al glifo; por defecto sólo lo lee el lector de pantalla. */
  labelHidden?: boolean;
  /** `true` alinea el spinner en la línea de texto en lugar de centrarlo en bloque. */
  inline?: boolean;
  className?: string;
  'data-testid'?: string;
}

const SIZE: Record<SpinnerSize, string> = {
  sm: 'h-icon-sm w-icon-sm',
  md: 'h-icon-md w-icon-md',
  lg: 'h-icon-lg w-icon-lg',
};

export function Spinner({
  size = 'md',
  label,
  labelHidden = true,
  inline = false,
  className,
  'data-testid': testId,
}: SpinnerProps): React.JSX.Element {
  const glyph = <Glyph className={cx(SIZE[size], 'text-secondary')} />;

  if (!label) {
    return (
      <span
        data-testid={testId}
        className={cx(inline ? 'inline-flex' : 'flex justify-center', className)}
      >
        {glyph}
      </span>
    );
  }

  return (
    <span
      role="status"
      // `status` no toma su nombre del contenido, así que el label se expone también como
      // `aria-label`; cuando además es visible, ambos coinciden y no hay duplicación.
      aria-label={label}
      data-testid={testId}
      className={cx(
        'items-center gap-2 text-body-sm text-secondary',
        inline ? 'inline-flex' : 'flex justify-center',
        className,
      )}
    >
      {glyph}
      {labelHidden ? null : <span>{label}</span>}
    </span>
  );
}
