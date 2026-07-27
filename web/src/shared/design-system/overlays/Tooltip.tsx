'use client';

import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../internal/cx';

/**
 * Tooltip — aclaración **complementaria** sobre un control ya etiquetado.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §30 (`Tooltip`) y §37.
 * Referencia visual: screen Stitch *Data & Overlays*. El texto del ejemplo menciona un «daily
 * exchange rate»: EventFlow **no convierte moneda** (BR-BUDGET-007), así que ese contenido no
 * se reproduce.
 *
 * Reglas duras:
 * - **Nunca es el nombre accesible.** Se asocia con `aria-describedby`; un `IconButton` sin
 *   `aria-label` sigue estando roto aunque tenga tooltip (§37 / WCAG 4.1.2).
 * - **Nunca contiene controles.** El contenido de un tooltip no es alcanzable por teclado ni
 *   por lector táctil; si hace falta interactuar, el componente correcto es `Popover`.
 * - Aparece en `hover` **y** en `focus` (WCAG 1.4.13) y se descarta con `Escape`.
 * - En pantallas táctiles no hay `hover`: por eso el significado obligatorio debe permanecer
 *   visible en la página, no aquí.
 *
 * No hay librería de tooltip instalada (Headless UI no lo expone), así que se implementa con un
 * portal a `document.body` y coordenadas medidas al abrir; así el panel no queda recortado por
 * un contenedor con `overflow` —el caso típico dentro de una tabla con scroll.
 */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /** Texto complementario ya traducido. Sin controles. */
  content: ReactNode;
  /** Disparador: un único elemento **focalizable** (`Button`, `IconButton`, `TextLink`…). */
  children: ReactElement;
  placement?: TooltipPlacement;
  /** Retardo de apertura en hover, en ms. El foco por teclado abre de inmediato. */
  delayMs?: number;
  className?: string;
  'data-testid'?: string;
}

interface Position {
  top: number;
  left: number;
}

const GAP = 8;

export function Tooltip({
  content,
  children,
  placement = 'top',
  delayMs = 200,
  className,
  'data-testid': testId,
}: TooltipProps): React.JSX.Element {
  const id = useId();
  const tooltipId = `${id}-tooltip`;
  const triggerRef = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });

  const clearTimer = useCallback((): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const place = useCallback((): void => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const base: Record<TooltipPlacement, Position> = {
      top: { top: rect.top - GAP, left: rect.left + rect.width / 2 },
      bottom: { top: rect.bottom + GAP, left: rect.left + rect.width / 2 },
      left: { top: rect.top + rect.height / 2, left: rect.left - GAP },
      right: { top: rect.top + rect.height / 2, left: rect.right + GAP },
    };
    setPosition(base[placement]);
  }, [placement]);

  const show = useCallback(
    (delay: number): void => {
      clearTimer();
      const reveal = (): void => {
        place();
        setOpen(true);
      };
      if (delay <= 0) reveal();
      else timer.current = setTimeout(reveal, delay);
    },
    [clearTimer, place],
  );

  const hide = useCallback((): void => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    if (!open) return;
    // Cerrar al hacer scroll o redimensionar: la posición se calcula una sola vez al abrir.
    const close = (): void => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const child = children as ReactElement<{
    ref?: React.Ref<HTMLElement>;
    'aria-describedby'?: string;
    onMouseEnter?: (event: unknown) => void;
    onMouseLeave?: (event: unknown) => void;
    onFocus?: (event: unknown) => void;
    onBlur?: (event: unknown) => void;
    onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  }>;

  const trigger = cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const original = (child as { ref?: unknown }).ref;
      if (typeof original === 'function') original(node);
      else if (original && typeof original === 'object')
        (original as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    // `aria-describedby` sólo mientras el tooltip está montado: apuntar a un id inexistente
    // deja al lector de pantalla sin descripción y ensucia la auditoría.
    'aria-describedby': open ? tooltipId : child.props['aria-describedby'],
    onMouseEnter: (event: unknown) => {
      child.props.onMouseEnter?.(event);
      show(delayMs);
    },
    onMouseLeave: (event: unknown) => {
      child.props.onMouseLeave?.(event);
      hide();
    },
    onFocus: (event: unknown) => {
      child.props.onFocus?.(event);
      show(0);
    },
    onBlur: (event: unknown) => {
      child.props.onBlur?.(event);
      hide();
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      child.props.onKeyDown?.(event);
      if (event.key === 'Escape' && open) hide();
    },
  });

  const TRANSFORM: Record<TooltipPlacement, string> = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  return (
    <>
      {trigger}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <span
              role="tooltip"
              id={tooltipId}
              data-testid={testId}
              data-placement={placement}
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                transform: TRANSFORM[placement],
              }}
              className={cx(
                'pointer-events-none z-tooltip max-w-xs rounded-button bg-surface-inverse px-2 py-1',
                'font-ui text-caption text-inverse shadow-overlay-dropdown',
                className,
              )}
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
