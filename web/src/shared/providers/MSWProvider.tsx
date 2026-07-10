'use client';

import { useEffect, type ReactNode } from 'react';

/**
 * Arranca el worker de MSW solo cuando `NEXT_PUBLIC_API_MOCKING === 'enabled'` (dev opt-in).
 * El `import()` vive DENTRO del bloque `if (NODE_ENV !== 'production')`: en el build de producción
 * `process.env.NODE_ENV` se reemplaza por `"production"`, el bloque queda como código muerto y
 * webpack/Terser eliminan el chunk de MSW (SEC-07 / build check). Falla silenciosamente (EC-04).
 */
export function MSWProvider({ children }: { children: ReactNode }): React.JSX.Element {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      let cancelled = false;
      import('@/tests/msw/browser')
        .then(({ worker }) => (cancelled ? undefined : worker.start({ onUnhandledRequest: 'warn' })))
        .then(() => {
          // eslint-disable-next-line no-console
          console.info('MSW worker started');
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('MSW init failed', err);
        });
      return () => {
        cancelled = true;
      };
    }
  }, []);

  return <>{children}</>;
}
