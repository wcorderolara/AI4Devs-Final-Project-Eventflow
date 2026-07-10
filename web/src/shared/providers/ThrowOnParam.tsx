'use client';

import { useSearchParams } from 'next/navigation';

/**
 * Disparador test-only para el E2E de error boundaries (US-106 AC-10): lanza un error de render
 * en el cliente cuando la URL contiene `?throw=1`. Al ser un error de render cliente, lo captura el
 * `error.tsx` de la ruta (o el `<ErrorBoundary>` raíz) y renderiza el fallback en el DOM vivo.
 */
export function ThrowOnParam(): null {
  const params = useSearchParams();
  if (params.get('throw') === '1') {
    throw new Error('E2E forced render error');
  }
  return null;
}
