'use client';

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * Alert — mensaje persistente a nivel de bloque o de página.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §27.
 *
 * - Cuatro variantes semánticas (UI-DEC-014). **Nunca** lila ni coral como color de feedback.
 * - Icono + texto: el color no es la única señal.
 * - `live` se activa **sólo cuando la alerta se inserta dinámicamente**; una alerta presente
 *   desde el render inicial no debe anunciarse (evita ruido en el lector de pantalla).
 * - **Reenvía la `ref`** al contenedor (misma convención que `Button`, PB-P2-028), para que un
 *   formulario pueda desplazar el foco al resumen de errores tras un envío fallido.
 */
export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  variant?: AlertVariant;
  /** Título opcional. Se renderiza como texto fuerte, no como heading, para no romper la jerarquía. */
  title?: ReactNode;
  /** Descripción / cuerpo. */
  children?: ReactNode;
  /** Acción de recuperación (normalmente un `Button` `secondary`/`ghost` del design system). */
  action?: ReactNode;
  /** Cuando se pasa, aparece el control de descarte. */
  onDismiss?: () => void;
  /** Nombre accesible del control de descarte (obligatorio si hay `onDismiss`). */
  dismissLabel?: string;
  /** Sustituye el glifo por defecto de la variante. */
  icon?: ReactNode;
  /**
   * `true` cuando la alerta aparece como consecuencia de una acción del usuario:
   * `role="alert"` en `error`, `role="status"` en el resto (Component Foundations §27).
   */
  live?: boolean;
  /** `tabIndex={-1}` cuando el consumidor va a mover el foco a la alerta programáticamente. */
  tabIndex?: number;
  className?: string;
  'data-testid'?: string;
}

const VARIANT: Record<AlertVariant, string> = {
  info: 'border-feedback-info bg-feedback-info',
  success: 'border-feedback-success bg-feedback-success',
  warning: 'border-feedback-warning bg-feedback-warning',
  error: 'border-feedback-error bg-feedback-error',
};

const ICON_COLOR: Record<AlertVariant, string> = {
  info: 'text-feedback-info-icon',
  success: 'text-feedback-success-icon',
  warning: 'text-feedback-warning-icon',
  error: 'text-feedback-error-icon',
};

const TITLE_COLOR: Record<AlertVariant, string> = {
  info: 'text-feedback-info',
  success: 'text-feedback-success',
  warning: 'text-feedback-warning',
  error: 'text-feedback-error',
};

const DEFAULT_ICON: Record<AlertVariant, ReactNode> = {
  info: <Info aria-hidden="true" className="h-icon-md w-icon-md" />,
  success: <CheckCircle2 aria-hidden="true" className="h-icon-md w-icon-md" />,
  warning: <AlertTriangle aria-hidden="true" className="h-icon-md w-icon-md" />,
  error: <XCircle aria-hidden="true" className="h-icon-md w-icon-md" />,
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    variant = 'info',
    title,
    children,
    action,
    onDismiss,
    dismissLabel,
    icon,
    live = false,
    tabIndex,
    className,
    'data-testid': testId,
  },
  ref,
) {
  const role = live ? (variant === 'error' ? 'alert' : 'status') : undefined;

  return (
    <div
      ref={ref}
      role={role}
      tabIndex={tabIndex}
      data-testid={testId}
      data-variant={variant}
      className={cx(
        'flex gap-3 rounded-card border p-4 font-body text-body-sm text-primary',
        VARIANT[variant],
        className,
      )}
    >
      <span className={cx('mt-0.5 inline-flex shrink-0', ICON_COLOR[variant])}>
        {icon ?? DEFAULT_ICON[variant]}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        {title ? (
          <p className={cx('font-ui text-label font-semibold', TITLE_COLOR[variant])}>{title}</p>
        ) : null}
        {children ? <div className="break-words">{children}</div> : null}
        {action ? <div className="flex flex-wrap gap-2 pt-2">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="focus-ring -m-2 inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-button text-secondary hover:bg-action-ghost-hover"
        >
          <X aria-hidden="true" className="h-icon-sm w-icon-sm" />
        </button>
      ) : null}
    </div>
  );
});
