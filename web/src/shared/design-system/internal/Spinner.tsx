import { Loader2 } from 'lucide-react';
import { cx } from './cx';

/**
 * Spinner interno del design system (Component Foundations §28).
 *
 * Es **decorativo**: quien lo usa aporta el estado accesible (`aria-busy` en el control,
 * `role="status"` en el contenedor, o un texto de carga visible). Por eso va `aria-hidden`.
 * `motion-reduce:animate-none` respeta `prefers-reduced-motion` (UI-DEC-015).
 */
export function Spinner({ className }: { className?: string }): React.JSX.Element {
  return (
    <Loader2
      aria-hidden="true"
      className={cx('animate-spin motion-reduce:animate-none', className)}
      strokeWidth={2}
    />
  );
}
