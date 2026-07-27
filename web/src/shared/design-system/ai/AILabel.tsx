import { Sparkles } from 'lucide-react';
import { cx } from '../internal/cx';

/**
 * AILabel — divulgación de origen «Sugerencia de IA».
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §31 (`AILabel`), §14 y
 * UI-DEC-010. Referencia visual: screen Stitch *AI, Marketing & Final Notes*.
 *
 * Reglas duras del contrato:
 * - **El texto es obligatorio.** El icono nunca comunica el origen por sí solo: `label` es un
 *   `string` requerido y siempre visible. El glifo va `aria-hidden` porque el texto ya lo dice.
 * - La familia `ai.*` no crea una paleta paralela: el estado de fallback reutiliza la familia
 *   semántica `warning` aprobada (Design Tokens §11).
 * - Sin glow, sin degradados animados, sin iconografía sci-fi (§31 anti-patterns).
 *
 * La nota de consolidación de Stitch propone un lila propio como fondo de IA y Font Awesome como
 * librería de iconos: **ninguna de las dos se adopta**. El fondo es el token `ai.surface` y el
 * glifo es `Sparkles` de `lucide-react`, la única librería ratificada.
 */
export interface AILabelProps {
  /** Texto visible ya traducido. Debe contener la palabra «Sugerencia» (§31 content rules). */
  label: string;
  /** Nombre accesible más completo cuando el texto visible se queda corto. */
  ariaLabel?: string;
  /**
   * Copy del fallback ya traducido (`Generado a partir de plantilla base`). Su presencia añade
   * un segundo badge con la familia `warning`; nunca revela el proveedor ni el error interno.
   */
  fallbackLabel?: string;
  fallbackAriaLabel?: string;
  /**
   * Opt-in de región viva. Sólo cuando la etiqueta aparece tras una acción del usuario; en el
   * render inicial de un listado se deja en `false` para no saturar al lector de pantalla.
   */
  live?: boolean;
  className?: string;
  'data-testid'?: string;
}

const BADGE =
  'inline-flex items-center gap-1 rounded-badge border px-2.5 py-0.5 font-ui text-caption font-medium';

export function AILabel({
  label,
  ariaLabel,
  fallbackLabel,
  fallbackAriaLabel,
  live = false,
  className,
  'data-testid': testId,
}: AILabelProps): React.JSX.Element {
  // `role="img"` etiqueta el badge sin crear región viva; `role="status"` sólo con `live`.
  const role = (name?: string): 'status' | 'img' | undefined =>
    name ? (live ? 'status' : 'img') : undefined;

  return (
    <span
      className={cx('inline-flex flex-wrap items-center gap-2', className)}
      data-testid={testId}
    >
      <span
        role={role(ariaLabel)}
        aria-label={ariaLabel}
        className={cx(BADGE, 'border-ai bg-ai-surface text-ai-label')}
      >
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ai-icon" />
        {label}
      </span>
      {fallbackLabel ? (
        <span
          role={role(fallbackAriaLabel)}
          aria-label={fallbackAriaLabel}
          className={cx(BADGE, 'border-feedback-warning bg-feedback-warning text-feedback-warning')}
        >
          {fallbackLabel}
        </span>
      ) : null}
    </span>
  );
}
