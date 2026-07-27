'use client';

import { Alert, ConfirmationDialog } from '@/shared/design-system';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Estilo destructivo para eliminar/cancelar. */
  destructive?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Diálogo de confirmación del feature de eventos (US-011 cancelar, US-012 eliminar borrador).
 *
 * PB-P2-031: deja de mantener su propio overlay y compone `ConfirmationDialog` del design
 * system. Con ello hereda el focus trap, el retorno del foco al disparador, el bloqueo del
 * scroll del body y la guarda de doble envío que la implementación nativa anterior no tenía;
 * el `role` pasa de `dialog` a `alertdialog`, el correcto para una interrupción que exige una
 * decisión. La API pública del componente **no cambia**: `EventActions` sigue igual.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  pending = false,
  error = null,
  onConfirm,
  onClose,
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <ConfirmationDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      variant={destructive ? 'destructive' : 'standard'}
      isLoading={pending}
      onConfirm={onConfirm}
    >
      {/* El error de la mutación permanece dentro del diálogo: cerrarlo y volver a abrirlo no
          puede ser la única forma de enterarse de que la operación falló (CMP-DEC-022). */}
      {error ? (
        <Alert variant="error" live>
          {error}
        </Alert>
      ) : null}
    </ConfirmationDialog>
  );
}
