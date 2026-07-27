'use client';

import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { useEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
import { IconButton } from '../actions/IconButton';
import { cx } from '../internal/cx';

/**
 * Modal — diálogo focal canónico.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §30 (`Modal`) y §37.
 * Referencia visual: screen Stitch *Data & Overlays* (backdrop + superficie con cabecera,
 * contenido y pie de acciones). El contenido del ejemplo de Stitch — invitar colaboradores — es
 * una **funcionalidad fuera del MVP** y no se implementa: el Modal es un contenedor vacío.
 *
 * Reutiliza el `Dialog` de Headless UI, ya instalado y usado por `MobileNavigationDrawer`. De él
 * vienen, sin código propio: focus trap, retorno del foco al disparador, bloqueo del scroll del
 * body, `aria-modal`, portal y el cierre por `Escape` y clic fuera.
 *
 * `closeOnEscape` y `closeOnOverlayClick` se distinguen porque `onClose` de Headless UI no dice
 * de dónde viene el cierre. Se resuelve con listeners en **fase de captura** sobre `document`,
 * que corren antes que los de la librería: un `pointerdown` fuera del panel marca el origen
 * «overlay» y cualquier tecla lo restablece a «teclado». El handler consulta esa marca.
 */
export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Título visible; es también el nombre accesible del diálogo. */
  title: ReactNode;
  /** Descripción opcional asociada por `aria-describedby`. */
  description?: ReactNode;
  /** Nombre accesible del botón de cierre, ya traducido. Obligatorio con `showCloseButton`. */
  closeLabel?: string;
  children?: ReactNode;
  /** Acciones del pie (`Button` del design system). */
  footer?: ReactNode;
  size?: ModalSize;
  /** `false` cuando cerrar podría perder datos del formulario. */
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  /** Elemento que recibe el foco al abrir. Por defecto lo decide Headless UI. */
  initialFocus?: MutableRefObject<HTMLElement | null>;
  /** `alertdialog` para confirmaciones que interrumpen un flujo. */
  role?: 'dialog' | 'alertdialog';
  className?: string;
  'data-testid'?: string;
}

const SIZE: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  closeLabel,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  initialFocus,
  role = 'dialog',
  className,
  'data-testid': testId,
}: ModalProps): React.JSX.Element {
  const panelRef = useRef<HTMLElement | null>(null);
  const dismissedByOverlay = useRef(false);

  useEffect(() => {
    if (!open) return;
    const markPointer = (event: Event): void => {
      const target = event.target as Node | null;
      dismissedByOverlay.current =
        target !== null && panelRef.current !== null && !panelRef.current.contains(target);
    };
    // Cualquier tecla devuelve el origen a «teclado»: si no, un clic fuera ignorado dejaría la
    // marca puesta y el `Escape` siguiente se evaluaría con la regla equivocada.
    const markKeyboard = (): void => {
      dismissedByOverlay.current = false;
    };
    document.addEventListener('pointerdown', markPointer, true);
    document.addEventListener('mousedown', markPointer, true);
    document.addEventListener('keydown', markKeyboard, true);
    return () => {
      document.removeEventListener('pointerdown', markPointer, true);
      document.removeEventListener('mousedown', markPointer, true);
      document.removeEventListener('keydown', markKeyboard, true);
    };
  }, [open]);

  const handleDismissRequest = (): void => {
    const fromOverlay = dismissedByOverlay.current;
    dismissedByOverlay.current = false;
    if (fromOverlay ? closeOnOverlayClick : closeOnEscape) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDismissRequest}
      initialFocus={initialFocus}
      role={role}
      className="relative z-modal"
    >
      <div className="fixed inset-0 bg-scrim" aria-hidden="true" />
      {/* Márgenes seguros en móvil y viewport utilizable completo: el panel puede crecer hasta
          `90vh` y hace scroll internamente en vez de empujar la página. */}
      <div className="fixed inset-0 flex items-end justify-center overflow-y-auto p-4 sm:items-center">
        <DialogPanel
          ref={panelRef}
          data-testid={testId}
          className={cx(
            'flex max-h-[90vh] w-full flex-col rounded-modal bg-surface-elevated shadow-overlay-modal',
            SIZE[size],
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-subtle p-4 sm:p-6">
            <div className="min-w-0">
              <DialogTitle className="font-heading text-h3 font-semibold text-primary">
                {title}
              </DialogTitle>
              {description ? (
                <Description className="mt-1 font-body text-body-sm text-secondary">
                  {description}
                </Description>
              ) : null}
            </div>
            {showCloseButton && closeLabel ? (
              <IconButton
                icon={<X />}
                variant="subtle"
                aria-label={closeLabel}
                onClick={onClose}
                className="-mr-2 -mt-2 shrink-0"
              />
            ) : null}
          </div>

          {children ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
          ) : null}

          {footer ? (
            // Acciones apiladas en pantallas estrechas; en fila y alineadas al final desde `sm`.
            <div className="flex flex-col-reverse items-stretch gap-2 border-t border-subtle p-4 sm:flex-row sm:items-center sm:justify-end sm:p-6">
              {footer}
            </div>
          ) : null}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
