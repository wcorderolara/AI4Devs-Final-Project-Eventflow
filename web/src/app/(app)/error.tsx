'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { ErrorState } from '@/shared/design-system';

/**
 * PB-P2-030 — El error boundary de `(app)` adopta `ErrorState` del design system.
 *
 * Se conserva exactamente el comportamiento previo: `role="alert"` (ahora lo aporta `ErrorState`),
 * el mismo copy (`errors.envelope.UNEXPECTED`), el mismo `reset` de Next y el mismo
 * `console.error` para observabilidad. Cambia sólo la presentación: tokens semánticos en lugar de
 * utilidades de paleta cruda, título de estado y jerarquía de heading.
 *
 * `error.digest` **no** se muestra: es un identificador de build del servidor, no el correlation
 * ID del envelope de la API. `ErrorState` sólo acepta texto ya preparado, de modo que este
 * boundary no puede filtrar el `message` ni la traza del `Error` al usuario.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tErrors = useTranslations('errors');
  const tCommon = useTranslations('common');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      variant="page"
      headingLevel={2}
      title={tCommon('error')}
      description={tErrors('envelope.UNEXPECTED')}
      onRetry={reset}
      retryLabel={tCommon('retry')}
      className="m-8 flex-1"
    />
  );
}
