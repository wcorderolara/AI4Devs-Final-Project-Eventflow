'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Button } from '../actions/Button';
import { cx } from '../internal/cx';
import { Modal } from './Modal';

/**
 * ConfirmationDialog — decisión explícita antes de una acción con consecuencias.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §30 (`ConfirmationDialog`).
 * Referencia visual: screen Stitch *Data & Overlays*. El título del ejemplo («Eliminar Evento»)
 * y su afirmación de irreversibilidad son **copy del ejemplo**: aquí todo el texto llega por
 * props desde `next-intl`, incluido el aviso de irreversibilidad, que sólo aparece si el
 * consumidor lo aporta.
 *
 * - Se construye sobre `Modal` con `role="alertdialog"`: no es un overlay paralelo.
 * - El foco inicial va a **Cancelar**, la opción segura: un `Enter` reflejo no ejecuta la
 *   acción destructiva.
 * - `onConfirm` puede ser asíncrona; mientras resuelve, el diálogo entra en carga y bloquea el
 *   reenvío. El cierre por `Escape` / clic fuera queda desactivado durante la operación para no
 *   dejar una mutación en vuelo sin retroalimentación.
 */
export type ConfirmationDialogVariant = 'standard' | 'destructive';

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Label explícito de la acción (`Cancelar evento`), nunca un `OK` genérico. */
  confirmLabel: string;
  cancelLabel: string;
  /**
   * Un diálogo de confirmación ya expone `Cancelar`: la «X» de cabecera es opcional y está
   * desactivada por defecto para no ofrecer dos salidas equivalentes.
   */
  showCloseButton?: boolean;
  /** Nombre accesible de la «X». Obligatorio con `showCloseButton`. */
  closeLabel?: string;
  onConfirm: () => void | Promise<unknown>;
  variant?: ConfirmationDialogVariant;
  /** Carga controlada por el consumidor (por ejemplo `mutation.isPending`). */
  isLoading?: boolean;
  /** Texto del botón mientras confirma. */
  loadingLabel?: string;
  /** Bloquea la confirmación hasta que se cumplan los requisitos del flujo. */
  confirmDisabled?: boolean;
  /** Glifo Lucide decorativo sobre el título. */
  icon?: ReactNode;
  /** Contenido adicional: `Alert` de error, `Checkbox` de confirmación, detalle del impacto. */
  children?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function ConfirmationDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel,
  showCloseButton = false,
  closeLabel,
  onConfirm,
  variant = 'standard',
  isLoading = false,
  loadingLabel,
  confirmDisabled = false,
  icon,
  children,
  className,
  'data-testid': testId,
}: ConfirmationDialogProps): React.JSX.Element {
  const cancelRef = useRef<HTMLElement | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const busy = isLoading || pending;

  const body =
    icon || children ? (
      <>
        {icon ? (
          <span
            aria-hidden="true"
            className={cx(
              'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-badge',
              variant === 'destructive'
                ? 'bg-feedback-error text-feedback-error-icon'
                : 'bg-surface-subtle text-secondary',
            )}
          >
            {icon}
          </span>
        ) : null}
        {children}
      </>
    ) : undefined;

  const handleConfirm = useCallback(async (): Promise<void> => {
    // Guarda de doble envío: `disabled` ya lo evita en el DOM, pero un `Enter` sostenido o un
    // consumidor que invoque el handler por otra vía llegaría dos veces a la mutación.
    if (inFlight.current || busy || confirmDisabled) return;
    inFlight.current = true;
    try {
      const result = onConfirm();
      if (result instanceof Promise) {
        setPending(true);
        await result;
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, [busy, confirmDisabled, onConfirm]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      role="alertdialog"
      size="sm"
      title={title}
      description={description}
      closeLabel={closeLabel}
      showCloseButton={showCloseButton && !busy}
      closeOnEscape={!busy}
      closeOnOverlayClick={!busy}
      initialFocus={cancelRef as React.MutableRefObject<HTMLElement | null>}
      className={className}
      data-testid={testId}
      footer={
        <>
          <Button
            ref={cancelRef as React.Ref<HTMLButtonElement>}
            variant="secondary"
            onClick={onClose}
            disabled={busy}
            fullWidth
            className="sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={() => void handleConfirm()}
            isLoading={busy}
            loadingLabel={loadingLabel}
            disabled={confirmDisabled}
            fullWidth
            className="sm:w-auto"
            data-testid="confirmation-dialog-confirm"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body}
    </Modal>
  );
}
