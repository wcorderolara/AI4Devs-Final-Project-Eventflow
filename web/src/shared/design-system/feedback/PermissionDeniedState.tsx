import { ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * PermissionDeniedState — respuesta 403 presentada al usuario.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §29.
 *
 * - **No divulga el recurso restringido**: la API no acepta id, ruta ni nombre de la entidad, de
 *   modo que el componente no puede confirmar su existencia (regla de no-revelación).
 * - Se distingue de `NotFoundState`: el feature elige uno u otro según el envelope de error.
 * - El backend es la autoridad de autorización; esta pantalla es sólo la presentación del 403
 *   (UI-DEC-008).
 */
export interface PermissionDeniedStateProps {
  title: ReactNode;
  /** Explicación adecuada al rol, ya traducida. */
  description?: ReactNode;
  /** Navegación segura (volver al dashboard del rol). */
  action?: ReactNode;
  /** Referencia de soporte, sólo si el producto ya la expone. */
  supportReference?: string;
  supportLabel?: string;
  headingLevel?: 1 | 2 | 3;
  className?: string;
  'data-testid'?: string;
}

export function PermissionDeniedState({
  title,
  description,
  action,
  supportReference,
  supportLabel,
  headingLevel = 1,
  className,
  'data-testid': testId,
}: PermissionDeniedStateProps): React.JSX.Element {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3';

  return (
    <div
      data-testid={testId}
      className={cx(
        'flex flex-col items-center rounded-card border border-subtle bg-surface p-10 text-center sm:p-12',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-badge bg-surface-subtle text-secondary"
      >
        <ShieldAlert className="h-icon-lg w-icon-lg" />
      </span>
      <Heading className="font-heading text-h2 font-semibold text-primary">{title}</Heading>
      {description ? (
        <p className="mt-2 max-w-form font-body text-body-md text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
      {supportReference && supportLabel ? (
        <p className="mt-4 font-body text-caption text-muted">
          {supportLabel}
          <span className="ml-1 select-all tabular-nums">{supportReference}</span>
        </p>
      ) : null}
    </div>
  );
}
