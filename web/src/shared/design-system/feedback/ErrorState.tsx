import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../actions/Button';
import { cx } from '../internal/cx';

/**
 * ErrorState — fallo recuperable a nivel de sección o de página.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §29.
 *
 * - **Sólo acepta texto ya preparado por el feature.** No recibe `Error`, ni respuesta cruda de
 *   API, ni `details` del envelope: así es imposible filtrar stack traces, mensajes del proveedor
 *   de IA o secretos. El mapeo `error.code → copy` pertenece al feature (mappers).
 * - El `correlationId` es metadata **secundaria** para soporte; nunca el mensaje principal.
 * - `role="alert"` porque el estado sustituye al contenido esperado tras una acción fallida.
 */
export type ErrorStateVariant = 'section' | 'page';

export interface ErrorStateProps {
  title: ReactNode;
  /** Explicación en lenguaje humano, ya traducida. */
  description?: ReactNode;
  /** Acción de reintento. Sin ella no se muestra el botón. */
  onRetry?: () => void;
  /** Label del reintento (obligatorio si hay `onRetry`). */
  retryLabel?: string;
  /** Navegación segura alternativa (`TextLink` / `Button` del design system). */
  secondaryAction?: ReactNode;
  /** Identificador de correlación del envelope de error. Se muestra como metadata discreta. */
  correlationId?: string;
  /** Etiqueta del identificador (p. ej. `Referencia`). Requerida para mostrar `correlationId`. */
  correlationLabel?: string;
  variant?: ErrorStateVariant;
  headingLevel?: 2 | 3 | 4;
  className?: string;
  'data-testid'?: string;
}

const VARIANT: Record<ErrorStateVariant, string> = {
  section: 'p-6',
  page: 'p-10 sm:p-12',
};

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  secondaryAction,
  correlationId,
  correlationLabel,
  variant = 'section',
  headingLevel = 3,
  className,
  'data-testid': testId,
}: ErrorStateProps): React.JSX.Element {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';

  return (
    <div
      role="alert"
      data-testid={testId}
      className={cx(
        'flex flex-col items-center rounded-card border border-feedback-error bg-feedback-error text-center',
        VARIANT[variant],
        className,
      )}
    >
      <span aria-hidden="true" className="mb-3 inline-flex text-feedback-error-icon">
        <AlertTriangle className="h-icon-lg w-icon-lg" />
      </span>
      <Heading className="font-heading text-h3 font-semibold text-feedback-error">{title}</Heading>
      {description ? (
        <p className="mt-2 max-w-form font-body text-body-sm text-primary">{description}</p>
      ) : null}
      {onRetry || secondaryAction ? (
        <div className="mt-6 flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          {onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : null}
          {secondaryAction}
        </div>
      ) : null}
      {correlationId && correlationLabel ? (
        <p className="mt-4 font-body text-caption text-muted">
          {correlationLabel}
          <span className="ml-1 select-all tabular-nums">{correlationId}</span>
        </p>
      ) : null}
    </div>
  );
}
