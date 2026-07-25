import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * InlineMessage — feedback contextual local, visualmente menor que `Alert`.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §27.
 *
 * - `helper` es neutro y **no** lleva icono semántico: es texto de apoyo, no un estado.
 * - **No sustituye al error de campo**: la asociación `aria-describedby` + `role="alert"` de un
 *   control de formulario la resuelve `FormField`. Usar esto para mensajes de bloque
 *   (una card, una sección, una fila) que no pertenecen a un único campo.
 */
export type InlineMessageTone = 'helper' | 'info' | 'success' | 'warning' | 'error';

export interface InlineMessageProps {
  tone?: InlineMessageTone;
  children: ReactNode;
  icon?: ReactNode;
  /** `true` cuando el mensaje aparece dinámicamente tras una acción del usuario. */
  live?: boolean;
  id?: string;
  className?: string;
  'data-testid'?: string;
}

const TONE: Record<InlineMessageTone, string> = {
  helper: 'text-secondary',
  info: 'text-feedback-info',
  success: 'text-feedback-success',
  warning: 'text-feedback-warning',
  error: 'text-feedback-error',
};

const TONE_ICON: Record<InlineMessageTone, ReactNode> = {
  helper: null,
  info: <Info aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  success: <CheckCircle2 aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  warning: <AlertTriangle aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  error: <XCircle aria-hidden="true" className="h-icon-sm w-icon-sm" />,
};

export function InlineMessage({
  tone = 'helper',
  children,
  icon,
  live = false,
  id,
  className,
  'data-testid': testId,
}: InlineMessageProps): React.JSX.Element {
  const glyph = icon ?? TONE_ICON[tone];
  const role = live ? (tone === 'error' ? 'alert' : 'status') : undefined;

  return (
    <p
      id={id}
      role={role}
      data-testid={testId}
      data-tone={tone}
      className={cx(
        'flex items-start gap-1.5 font-body text-body-sm',
        tone === 'helper' ? 'font-normal' : 'font-medium',
        TONE[tone],
        className,
      )}
    >
      {glyph ? <span className="mt-0.5 inline-flex shrink-0">{glyph}</span> : null}
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}
