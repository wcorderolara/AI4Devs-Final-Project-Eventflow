'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { ErrorState } from '@/shared/design-system';

/**
 * Error boundary de `/login`. Equivale al de `(auth)`, que `/login` dejó de heredar al moverse a
 * su propio route group; adopta `ErrorState` (mismo patrón que `(app)/error.tsx`).
 *
 * No expone `error.message` ni `error.digest`: en la ruta de autenticación cualquier detalle del
 * servidor es superficie de información innecesaria.
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
    />
  );
}
