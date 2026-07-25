'use client';

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * Toast — confirmación transitoria.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §27 y CMP-DEC-022.
 *
 * REGLAS DE PRODUCTO QUE ESTE COMPONENTE **NO** PUEDE GARANTIZAR SOLO:
 * - Un toast **nunca** es el único lugar donde se comunica un error crítico: el feature debe
 *   mantener el error también en un `Alert`/`InlineMessage` de la página.
 * - No crear toasts indefinidos sin motivo: `autoDismissMs` tiene un default legible (5 s) y
 *   pasar `null` (persistente) debe justificarse en el feature.
 *
 * En el repositorio **no existe** un sistema de toasts (ni librería ni provider). Esta pieza es
 * el primitivo presentacional; la cola/stacking y el portal quedan diferidos al grupo de
 * overlays, y no se instaló ninguna dependencia nueva.
 */
export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface ToastProps {
  variant?: ToastVariant;
  title?: ReactNode;
  children: ReactNode;
  /** Acción opcional (`Deshacer`, `Ver detalle`). */
  action?: ReactNode;
  onDismiss: () => void;
  /** Nombre accesible del control de descarte. */
  dismissLabel: string;
  /** Milisegundos hasta el auto-descarte. `null` mantiene el toast hasta acción del usuario. */
  autoDismissMs?: number | null;
  className?: string;
  'data-testid'?: string;
}

const VARIANT: Record<ToastVariant, string> = {
  success: 'border-feedback-success bg-feedback-success',
  info: 'border-feedback-info bg-feedback-info',
  warning: 'border-feedback-warning bg-feedback-warning',
  error: 'border-feedback-error bg-feedback-error',
};

const ICON_COLOR: Record<ToastVariant, string> = {
  success: 'text-feedback-success-icon',
  info: 'text-feedback-info-icon',
  warning: 'text-feedback-warning-icon',
  error: 'text-feedback-error-icon',
};

const ICON: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 aria-hidden="true" className="h-icon-md w-icon-md" />,
  info: <Info aria-hidden="true" className="h-icon-md w-icon-md" />,
  warning: <AlertTriangle aria-hidden="true" className="h-icon-md w-icon-md" />,
  error: <XCircle aria-hidden="true" className="h-icon-md w-icon-md" />,
};

export function Toast({
  variant = 'info',
  title,
  children,
  action,
  onDismiss,
  dismissLabel,
  autoDismissMs = 5000,
  className,
  'data-testid': testId,
}: ToastProps): React.JSX.Element {
  useEffect(() => {
    if (autoDismissMs === null || autoDismissMs === undefined) return;
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  return (
    <div
      // `alert` interrumpe: se reserva a error. El resto usa `status` (`aria-live="polite"`).
      role={variant === 'error' ? 'alert' : 'status'}
      data-testid={testId}
      data-variant={variant}
      className={cx(
        'pointer-events-auto flex w-full max-w-form gap-3 rounded-card border p-4',
        'font-body text-body-sm text-primary shadow-overlay-dropdown',
        VARIANT[variant],
        className,
      )}
    >
      <span className={cx('mt-0.5 inline-flex shrink-0', ICON_COLOR[variant])}>
        {ICON[variant]}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-ui text-label font-semibold">{title}</p> : null}
        <div className="break-words">{children}</div>
        {action ? <div className="flex flex-wrap gap-2 pt-2">{action}</div> : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        className="focus-ring -m-2 inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-button text-secondary hover:bg-action-ghost-hover"
      >
        <X aria-hidden="true" className="h-icon-sm w-icon-sm" />
      </button>
    </div>
  );
}
